using System.Text;
using LoadoutQueue.Api.Domain.Entities;
using LoadoutQueue.Api.Infrastructure.Authentication;
using LoadoutQueue.Api.Persistence;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LoadoutQueue.Api.Features.Authentication;

public sealed class AuthService(
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext database,
    TokenService tokenService,
    TimeProvider timeProvider,
    IPasswordResetEmailSender passwordResetEmailSender,
    IOptions<PasswordRecoveryOptions> passwordRecoveryOptions,
    ILogger<AuthService> logger)
{
    public async Task RequestPasswordResetAsync(
        ForgotPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());

        if (user?.Email is null)
        {
            return;
        }

        var rawToken = await userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = WebEncoders.Base64UrlEncode(
            Encoding.UTF8.GetBytes(rawToken));
        var baseUrl = passwordRecoveryOptions.Value.FrontendBaseUrl
            .TrimEnd('/');
        var resetLink = new Uri(
            $"{baseUrl}/reset-password" +
            $"#userId={Uri.EscapeDataString(user.Id.ToString())}" +
            $"&token={Uri.EscapeDataString(encodedToken)}");

        try
        {
            await passwordResetEmailSender.SendAsync(
                user.Email,
                user.DisplayName,
                resetLink,
                cancellationToken);
        }
        catch (Exception exception) when (
            !cancellationToken.IsCancellationRequested &&
            exception is HttpRequestException
                or InvalidOperationException
                or TaskCanceledException)
        {
            logger.LogError(
                exception,
                "Could not send a password reset email for user {UserId}.",
                user.Id);
        }
    }

    public async Task<IdentityResult> ResetPasswordAsync(
        ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(request.UserId.ToString());

        if (user is null)
        {
            return IdentityResult.Failed(new IdentityError
            {
                Code = "InvalidToken",
                Description = "Invalid password reset token."
            });
        }

        string rawToken;

        try
        {
            rawToken = Encoding.UTF8.GetString(
                WebEncoders.Base64UrlDecode(request.Token));
        }
        catch (FormatException)
        {
            return IdentityResult.Failed(new IdentityError
            {
                Code = "InvalidToken",
                Description = "Invalid password reset token."
            });
        }

        var result = await userManager.ResetPasswordAsync(
            user,
            rawToken,
            request.Password);

        if (!result.Succeeded)
        {
            return result;
        }

        var now = timeProvider.GetUtcNow();
        user.UpdatedAt = now;
        await userManager.UpdateAsync(user);

        await database.RefreshTokens
            .Where(token =>
                token.UserId == user.Id &&
                token.RevokedAt == null)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(
                    token => token.RevokedAt,
                    now),
                cancellationToken);

        return result;
    }

    public async Task<IdentityResult> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());

        if (user is null)
        {
            return IdentityResult.Failed(new IdentityError
            {
                Code = "UserNotFound",
                Description = "User not found."
            });
        }

        var now = timeProvider.GetUtcNow();
        user.UpdatedAt = now;

        var result = await userManager.ChangePasswordAsync(
            user,
            request.CurrentPassword,
            request.NewPassword);

        if (!result.Succeeded)
        {
            return result;
        }

        await database.RefreshTokens
            .Where(token =>
                token.UserId == user.Id &&
                token.RevokedAt == null)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(
                    token => token.RevokedAt,
                    now),
                cancellationToken);

        return result;
    }

    public async Task<(AuthSession? Session, IdentityResult Result)> RegisterAsync(
        RegisterRequest request,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        await using var transaction = await database.Database
            .BeginTransactionAsync(cancellationToken);

        var now = timeProvider.GetUtcNow();
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            DisplayName = request.DisplayName.Trim(),
            Email = request.Email.Trim(),
            UserName = request.Email.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        var result = await userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return (null, result);
        }

        var session = await CreateSessionAsync(
            user,
            ipAddress,
            cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return (session, result);
    }

    public async Task<AuthSession?> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());

        if (user is null ||
            !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return null;
        }

        return await CreateSessionAsync(user, ipAddress, cancellationToken);
    }

    public async Task<AuthSession?> RefreshAsync(
        string refreshToken,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var tokenHash = tokenService.HashToken(refreshToken);
        await using var transaction = await database.Database
            .BeginTransactionAsync(cancellationToken);

        var storedToken = await database.RefreshTokens
            .FromSqlInterpolated(
                $"""
                SELECT *
                FROM "RefreshTokens"
                WHERE "TokenHash" = {tokenHash}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync(cancellationToken);

        var now = timeProvider.GetUtcNow();

        if (storedToken is null ||
            storedToken.RevokedAt is not null ||
            storedToken.ExpiresAt <= now)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        var user = await database.Users
            .SingleOrDefaultAsync(
                candidate => candidate.Id == storedToken.UserId,
                cancellationToken);

        if (user is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        var replacement = tokenService.CreateRefreshToken(
            user.Id,
            ipAddress,
            now);
        storedToken.RevokedAt = now;
        storedToken.RevokedByIp = tokenService.NormalizeIpAddress(ipAddress);
        storedToken.ReplacedByTokenHash = replacement.Entity.TokenHash;

        database.RefreshTokens.Add(replacement.Entity);
        await database.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return CreateSession(user, replacement.RawToken, replacement.Entity);
    }

    public async Task LogoutAsync(
        string? refreshToken,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var tokenHash = tokenService.HashToken(refreshToken);
        var now = timeProvider.GetUtcNow();
        var normalizedIp = tokenService.NormalizeIpAddress(ipAddress);

        await database.RefreshTokens
            .Where(token =>
                token.TokenHash == tokenHash &&
                token.RevokedAt == null)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(token => token.RevokedAt, now)
                    .SetProperty(token => token.RevokedByIp, normalizedIp),
                cancellationToken);
    }

    public Task<CurrentUserResponse?> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        return database.Users
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => new CurrentUserResponse(
                user.Id,
                user.DisplayName,
                user.Email!))
            .SingleOrDefaultAsync(cancellationToken);
    }

    private async Task<AuthSession> CreateSessionAsync(
        ApplicationUser user,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var refreshToken = tokenService.CreateRefreshToken(
            user.Id,
            ipAddress,
            timeProvider.GetUtcNow());

        database.RefreshTokens.Add(refreshToken.Entity);
        await database.SaveChangesAsync(cancellationToken);

        return CreateSession(user, refreshToken.RawToken, refreshToken.Entity);
    }

    private AuthSession CreateSession(
        ApplicationUser user,
        string rawRefreshToken,
        RefreshToken refreshToken)
    {
        var accessToken = tokenService.CreateAccessToken(
            user,
            timeProvider.GetUtcNow());
        return new AuthSession(
            new AuthResponse(
                accessToken.Token,
                accessToken.ExpiresAt,
                new CurrentUserResponse(
                    user.Id,
                    user.DisplayName,
                    user.Email ?? string.Empty)),
            rawRefreshToken,
            refreshToken.ExpiresAt);
    }
}
