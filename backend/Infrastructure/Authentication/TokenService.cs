using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LoadoutQueue.Api.Domain.Entities;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace LoadoutQueue.Api.Infrastructure.Authentication;

public sealed record AccessTokenResult(
    string Token,
    DateTimeOffset ExpiresAt);

public sealed record RefreshTokenResult(
    string RawToken,
    RefreshToken Entity);

public sealed class TokenService(IOptions<JwtOptions> jwtOptions)
{
    private readonly JwtOptions jwt = jwtOptions.Value;

    public AccessTokenResult CreateAccessToken(
        ApplicationUser user,
        DateTimeOffset now)
    {
        var expiresAt = now.AddMinutes(jwt.AccessTokenMinutes);
        var signingKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwt.SigningKey));

        Claim[] claims =
        [
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Name, user.DisplayName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        ];

        var token = new JwtSecurityToken(
            issuer: jwt.Issuer,
            audience: jwt.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: new SigningCredentials(
                signingKey,
                SecurityAlgorithms.HmacSha256));

        return new AccessTokenResult(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt);
    }

    public RefreshTokenResult CreateRefreshToken(
        Guid userId,
        string? ipAddress,
        DateTimeOffset now)
    {
        var rawToken = WebEncoders.Base64UrlEncode(
            RandomNumberGenerator.GetBytes(64));

        return new RefreshTokenResult(
            rawToken,
            new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TokenHash = HashToken(rawToken),
                CreatedAt = now,
                ExpiresAt = now.AddDays(jwt.RefreshTokenDays),
                CreatedByIp = NormalizeIpAddress(ipAddress)
            });
    }

    public string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexStringLower(hash);
    }

    public string? NormalizeIpAddress(string? ipAddress)
    {
        return string.IsNullOrWhiteSpace(ipAddress)
            ? null
            : ipAddress.Length <= 64
                ? ipAddress
                : ipAddress[..64];
    }
}
