namespace LoadoutQueue.Api.Features.Authentication;

public sealed class PasswordRecoveryOptions
{
    public const string SectionName = "PasswordRecovery";

    public string FrontendBaseUrl { get; init; } = "http://localhost:5173";

    public int TokenLifetimeMinutes { get; init; } = 30;
}

public sealed class ResendOptions
{
    public const string SectionName = "Resend";

    public string ApiKey { get; init; } = string.Empty;

    public string FromAddress { get; init; } =
        "no-reply@sur-tec.com.ar";

    public string FromName { get; init; } = "Gear List";
}
