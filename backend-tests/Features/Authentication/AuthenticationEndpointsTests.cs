using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using LoadoutQueue.Api.Features.Authentication;
using LoadoutQueue.Api.Persistence;
using LoadoutQueue.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LoadoutQueue.Api.Tests.Features.Authentication;

[Collection(PostgreSqlCollection.Name)]
public sealed class AuthenticationEndpointsTests(
    PostgreSqlFixture postgres) : IDisposable
{
    private readonly ApiFactory factory = new(postgres.ConnectionString);

    [Fact]
    public async Task RegisterReturnsTokensAndStoresOnlyRefreshTokenHash()
    {
        using var client = CreateClient();
        var request = CreateRegistration();

        var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();
        auth!.AccessToken.Should().NotBeNullOrWhiteSpace();
        auth.User.Email.Should().Be(request.Email);

        var setCookie = response.Headers
            .GetValues("Set-Cookie")
            .Single(value => value.StartsWith($"{AuthCookie.Name}="));

        setCookie.Should().Contain("httponly");
        setCookie.Should().Contain("samesite=strict");

        var rawRefreshToken = setCookie
            .Split(';', 2)[0]
            .Split('=', 2)[1];

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var storedToken = await database.RefreshTokens
            .AsNoTracking()
            .SingleAsync(token => token.UserId == auth.User.Id);

        storedToken.TokenHash.Should().HaveLength(64);
        storedToken.TokenHash.Should().NotBe(rawRefreshToken);
    }

    [Fact]
    public async Task LoginRejectsWrongPasswordAndAcceptsValidCredentials()
    {
        using var registrationClient = CreateClient();
        var registration = CreateRegistration();
        await RegisterAsync(registrationClient, registration);

        using var loginClient = CreateClient();
        var invalidResponse = await loginClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(registration.Email, "WrongPass123"));
        var validResponse = await loginClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(registration.Email, registration.Password));

        invalidResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        validResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        validResponse.Headers.GetValues("Set-Cookie")
            .Should()
            .Contain(value => value.StartsWith($"{AuthCookie.Name}="));
    }

    [Fact]
    public async Task CurrentUserRequiresAndAcceptsAccessToken()
    {
        using var client = CreateClient();
        var registration = CreateRegistration();
        var auth = await RegisterAsync(client, registration);

        var anonymousResponse = await client.GetAsync("/api/auth/me");

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        var authenticatedResponse = await client.GetAsync("/api/auth/me");
        var currentUser = await authenticatedResponse.Content
            .ReadFromJsonAsync<CurrentUserResponse>();

        anonymousResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        authenticatedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        currentUser!.Id.Should().Be(auth.User.Id);
        currentUser.Email.Should().Be(registration.Email);
    }

    [Fact]
    public async Task RefreshRotatesTokenAndLogoutRevokesReplacement()
    {
        using var client = CreateClient();
        var auth = await RegisterAsync(client, CreateRegistration());

        var refreshResponse = await client.PostAsync(
            "/api/auth/refresh",
            content: null);

        refreshResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var database = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            var tokens = await database.RefreshTokens
                .AsNoTracking()
                .Where(token => token.UserId == auth.User.Id)
                .OrderBy(token => token.CreatedAt)
                .ToListAsync();

            tokens.Should().HaveCount(2);
            tokens.Count(token => token.RevokedAt is not null).Should().Be(1);
            tokens.Count(token => token.RevokedAt is null).Should().Be(1);
            tokens[0].ReplacedByTokenHash.Should().Be(tokens[1].TokenHash);
        }

        var logoutResponse = await client.PostAsync(
            "/api/auth/logout",
            content: null);
        var refreshAfterLogout = await client.PostAsync(
            "/api/auth/refresh",
            content: null);

        logoutResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        refreshAfterLogout.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RegisterReturnsValidationProblemForWeakPassword()
    {
        using var client = CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest(
                "Validation User",
                UniqueEmail(),
                "weak",
                "weak"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType!.MediaType
            .Should().Be("application/problem+json");
    }

    [Fact]
    public async Task ForgotPasswordDoesNotRevealWhetherAccountExists()
    {
        using var client = CreateClient();
        var registration = CreateRegistration();
        await RegisterAsync(client, registration);

        var knownResponse = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordRequest(registration.Email));
        var unknownResponse = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordRequest(UniqueEmail()));

        knownResponse.StatusCode.Should().Be(HttpStatusCode.Accepted);
        unknownResponse.StatusCode.Should().Be(HttpStatusCode.Accepted);

        var knownBody = await knownResponse.Content
            .ReadFromJsonAsync<PasswordRecoveryAcceptedResponse>();
        var unknownBody = await unknownResponse.Content
            .ReadFromJsonAsync<PasswordRecoveryAcceptedResponse>();

        knownBody.Should().BeEquivalentTo(unknownBody);
        factory.PasswordResetEmails.Emails.Should().ContainSingle();
        factory.PasswordResetEmails.Emails.Single().RecipientEmail
            .Should().Be(registration.Email);
    }

    [Fact]
    public async Task PasswordResetIsSingleUseAndRevokesRefreshSessions()
    {
        using var client = CreateClient();
        var registration = CreateRegistration();
        var auth = await RegisterAsync(client, registration);

        var forgotResponse = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordRequest(registration.Email));
        forgotResponse.EnsureSuccessStatusCode();

        var email = factory.PasswordResetEmails.Emails.Single();
        var encodedToken = email.ResetLink.Fragment
            .TrimStart('#')
            .Split('&')
            .Single(value => value.StartsWith("token="))
            .Split('=', 2)[1];
        var request = new ResetPasswordRequest(
            auth.User.Id,
            Uri.UnescapeDataString(encodedToken),
            "NewValidPass456",
            "NewValidPass456");

        var resetResponse = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            request);
        var reusedTokenResponse = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            request);
        var refreshResponse = await client.PostAsync(
            "/api/auth/refresh",
            content: null);

        using var loginClient = CreateClient();
        var oldPasswordResponse = await loginClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(registration.Email, registration.Password));
        var newPasswordResponse = await loginClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(registration.Email, request.Password));

        resetResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        reusedTokenResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        refreshResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        oldPasswordResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        newPasswordResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var activeRefreshTokens = await database.RefreshTokens
            .CountAsync(
                token =>
                    token.UserId == auth.User.Id &&
                    token.RevokedAt == null);
        var dataProtectionKeys = await database.DataProtectionKeys.CountAsync();

        activeRefreshTokens.Should().Be(1);
        dataProtectionKeys.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task ChangePasswordRequiresCurrentPasswordAndRevokesSessions()
    {
        using var client = CreateClient();
        var registration = CreateRegistration();
        var auth = await RegisterAsync(client, registration);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var changeResponse = await client.PostAsJsonAsync(
            "/api/auth/change-password",
            new ChangePasswordRequest(
                registration.Password,
                "NewValidPass456",
                "NewValidPass456"));
        var refreshResponse = await client.PostAsync(
            "/api/auth/refresh",
            content: null);

        using var loginClient = CreateClient();
        var oldPasswordResponse = await loginClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(registration.Email, registration.Password));
        var newPasswordResponse = await loginClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(registration.Email, "NewValidPass456"));

        changeResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        changeResponse.Headers.GetValues("Set-Cookie")
            .Should()
            .Contain(value =>
                value.StartsWith($"{AuthCookie.Name}=") &&
                value.Contains("expires=", StringComparison.OrdinalIgnoreCase));
        refreshResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        oldPasswordResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        newPasswordResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var activeRefreshTokens = await database.RefreshTokens
            .CountAsync(
                token =>
                    token.UserId == auth.User.Id &&
                    token.RevokedAt == null);

        activeRefreshTokens.Should().Be(1);
    }

    [Fact]
    public async Task ChangePasswordRejectsAnIncorrectCurrentPassword()
    {
        using var client = CreateClient();
        var registration = CreateRegistration();
        var auth = await RegisterAsync(client, registration);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var response = await client.PostAsJsonAsync(
            "/api/auth/change-password",
            new ChangePasswordRequest(
                "WrongPass123",
                "NewValidPass456",
                "NewValidPass456"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("La contrase");

        using var loginClient = CreateClient();
        var loginResponse = await loginClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(registration.Email, registration.Password));
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ForgotPasswordValidatesEmail()
    {
        using var client = CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordRequest("not-an-email"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        factory.PasswordResetEmails.Emails.Should().BeEmpty();
    }

    [Fact]
    public async Task AuthenticationRateLimitRejectsEleventhAttempt()
    {
        using var client = CreateClient();
        var statuses = new List<HttpStatusCode>();

        for (var attempt = 0; attempt < 11; attempt++)
        {
            var response = await client.PostAsJsonAsync(
                "/api/auth/login",
                new LoginRequest(UniqueEmail(), "WrongPass123"));
            statuses.Add(response.StatusCode);
        }

        statuses.Take(10)
            .Should()
            .OnlyContain(status => status == HttpStatusCode.Unauthorized);
        statuses[10].Should().Be(HttpStatusCode.TooManyRequests);
    }

    public void Dispose()
    {
        factory.Dispose();
    }

    private HttpClient CreateClient()
    {
        return factory.CreateClient(
            new WebApplicationFactoryClientOptions
            {
                HandleCookies = true
            });
    }

    private static async Task<AuthResponse> RegisterAsync(
        HttpClient client,
        RegisterRequest request)
    {
        var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            request);

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    private static RegisterRequest CreateRegistration()
    {
        return new RegisterRequest(
            "Integration User",
            UniqueEmail(),
            "ValidPass123",
            "ValidPass123");
    }

    private static string UniqueEmail()
    {
        return $"user-{Guid.NewGuid():N}@example.com";
    }
}
