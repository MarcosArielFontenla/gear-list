namespace LoadoutQueue.Api.Features.Authentication;

public sealed record RegisterRequest(
    string DisplayName,
    string Email,
    string Password,
    string ConfirmPassword);

public sealed record LoginRequest(
    string Email,
    string Password);

public sealed record ForgotPasswordRequest(string Email);

public sealed record ResetPasswordRequest(
    Guid UserId,
    string Token,
    string Password,
    string ConfirmPassword);

public sealed record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword,
    string ConfirmPassword);

public sealed record PasswordRecoveryAcceptedResponse(string Message);

public sealed record CurrentUserResponse(
    Guid Id,
    string DisplayName,
    string Email);

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    CurrentUserResponse User);

public sealed record AuthSession(
    AuthResponse Response,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt);
