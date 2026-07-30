namespace LoadoutQueue.Api.Features.Authentication;

public static class AuthCookie
{
    public const string Name = "loadout_refresh";

    private const string Path = "/api/auth";

    public static void Append(
        HttpResponse response,
        AuthSession session,
        IHostEnvironment environment)
    {
        response.Cookies.Append(
            Name,
            session.RefreshToken,
            CreateOptions(environment, session.RefreshTokenExpiresAt));
    }

    public static void Delete(
        HttpResponse response,
        IHostEnvironment environment)
    {
        response.Cookies.Delete(
            Name,
            CreateOptions(environment, DateTimeOffset.UnixEpoch));
    }

    private static CookieOptions CreateOptions(
        IHostEnvironment environment,
        DateTimeOffset expiresAt)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = environment.IsProduction(),
            SameSite = SameSiteMode.Strict,
            IsEssential = true,
            Path = Path,
            Expires = expiresAt
        };
    }
}
