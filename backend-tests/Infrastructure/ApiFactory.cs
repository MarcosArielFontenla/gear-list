using System.Collections.Concurrent;
using LoadoutQueue.Api.Features.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LoadoutQueue.Api.Tests.Infrastructure;

public sealed class ApiFactory(string connectionString)
    : WebApplicationFactory<Program>
{
    private const string TestSigningKey =
        "integration-test-signing-key-with-at-least-32-bytes";

    public RecordingPasswordResetEmailSender PasswordResetEmails { get; } =
        new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration(configuration =>
        {
            configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = connectionString,
                    ["Jwt:SigningKey"] = TestSigningKey,
                    ["Jwt:AccessTokenMinutes"] = "5",
                    ["Jwt:RefreshTokenDays"] = "1",
                    ["PasswordRecovery:FrontendBaseUrl"] =
                        "http://localhost:5173",
                    ["PasswordRecovery:TokenLifetimeMinutes"] = "30",
                    ["Cors:AllowedOrigins:0"] = "http://localhost",
                    ["Serilog:MinimumLevel:Default"] = "Warning"
                });
        });
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPasswordResetEmailSender>();
            services.AddSingleton<IPasswordResetEmailSender>(
                PasswordResetEmails);
        });
    }
}

public sealed record PasswordResetEmail(
    string RecipientEmail,
    string RecipientName,
    Uri ResetLink);

public sealed class RecordingPasswordResetEmailSender
    : IPasswordResetEmailSender
{
    private readonly ConcurrentQueue<PasswordResetEmail> emails = new();

    public IReadOnlyCollection<PasswordResetEmail> Emails =>
        emails.ToArray();

    public Task SendAsync(
        string recipientEmail,
        string recipientName,
        Uri resetLink,
        CancellationToken cancellationToken)
    {
        emails.Enqueue(new PasswordResetEmail(
            recipientEmail,
            recipientName,
            resetLink));
        return Task.CompletedTask;
    }
}
