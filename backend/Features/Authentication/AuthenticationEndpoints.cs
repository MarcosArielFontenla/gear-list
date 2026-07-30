using System.Security.Claims;
using FluentValidation;
using LoadoutQueue.Api.Common.Errors;
using LoadoutQueue.Api.Common.Security;
using Microsoft.AspNetCore.Identity;

namespace LoadoutQueue.Api.Features.Authentication;

public static class AuthenticationEndpoints
{
    public static IEndpointRouteBuilder MapAuthenticationEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/auth")
            .WithTags("Authentication");

        group.MapPost("/register", RegisterAsync)
            .WithName("Register")
            .RequireRateLimiting("authentication")
            .Produces<AuthResponse>()
            .ProducesValidationProblem();

        group.MapPost("/login", LoginAsync)
            .WithName("Login")
            .RequireRateLimiting("authentication")
            .Produces<AuthResponse>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/forgot-password", ForgotPasswordAsync)
            .WithName("ForgotPassword")
            .RequireRateLimiting("password-recovery")
            .Produces<PasswordRecoveryAcceptedResponse>(
                StatusCodes.Status202Accepted)
            .ProducesValidationProblem();

        group.MapPost("/reset-password", ResetPasswordAsync)
            .WithName("ResetPassword")
            .RequireRateLimiting("password-recovery")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesValidationProblem();

        group.MapPost("/change-password", ChangePasswordAsync)
            .WithName("ChangePassword")
            .RequireAuthorization()
            .RequireRateLimiting("authentication")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/refresh", RefreshAsync)
            .WithName("RefreshAccessToken")
            .Produces<AuthResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/logout", LogoutAsync)
            .WithName("Logout")
            .Produces(StatusCodes.Status204NoContent);

        group.MapGet("/me", GetCurrentUserAsync)
            .WithName("GetCurrentUser")
            .RequireAuthorization()
            .Produces<CurrentUserResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return endpoints;
    }

    private static async Task<IResult> RegisterAsync(
        RegisterRequest request,
        IValidator<RegisterRequest> validator,
        AuthService authService,
        HttpContext context,
        IHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(
            request,
            cancellationToken);

        if (!validation.IsValid)
        {
            return Results.ValidationProblem(
                validation.ToProblemDetailsErrors());
        }

        var (session, identityResult) = await authService.RegisterAsync(
            request,
            GetIpAddress(context),
            cancellationToken);

        if (session is null)
        {
            return Results.ValidationProblem(ToErrors(identityResult));
        }

        AuthCookie.Append(context.Response, session, environment);
        return Results.Ok(session.Response);
    }

    private static async Task<IResult> ForgotPasswordAsync(
        ForgotPasswordRequest request,
        IValidator<ForgotPasswordRequest> validator,
        AuthService authService,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(
            request,
            cancellationToken);

        if (!validation.IsValid)
        {
            return Results.ValidationProblem(
                validation.ToProblemDetailsErrors());
        }

        await authService.RequestPasswordResetAsync(
            request,
            cancellationToken);

        return Results.Accepted(
            value: new PasswordRecoveryAcceptedResponse(
                "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña."));
    }

    private static async Task<IResult> ResetPasswordAsync(
        ResetPasswordRequest request,
        IValidator<ResetPasswordRequest> validator,
        AuthService authService,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(
            request,
            cancellationToken);

        if (!validation.IsValid)
        {
            return Results.ValidationProblem(
                validation.ToProblemDetailsErrors());
        }

        var result = await authService.ResetPasswordAsync(
            request,
            cancellationToken);

        if (!result.Succeeded)
        {
            return Results.ValidationProblem(ToErrors(result));
        }

        return Results.NoContent();
    }

    private static async Task<IResult> ChangePasswordAsync(
        ChangePasswordRequest request,
        IValidator<ChangePasswordRequest> validator,
        ClaimsPrincipal principal,
        AuthService authService,
        HttpContext context,
        IHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(
            request,
            cancellationToken);

        if (!validation.IsValid)
        {
            return Results.ValidationProblem(
                validation.ToProblemDetailsErrors());
        }

        if (!principal.TryGetUserId(out var userId))
        {
            return Results.Unauthorized();
        }

        var result = await authService.ChangePasswordAsync(
            userId,
            request,
            cancellationToken);

        if (!result.Succeeded)
        {
            return Results.ValidationProblem(ToErrors(result));
        }

        AuthCookie.Delete(context.Response, environment);
        return Results.NoContent();
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        IValidator<LoginRequest> validator,
        AuthService authService,
        HttpContext context,
        IHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(
            request,
            cancellationToken);

        if (!validation.IsValid)
        {
            return Results.ValidationProblem(
                validation.ToProblemDetailsErrors());
        }

        var session = await authService.LoginAsync(
            request,
            GetIpAddress(context),
            cancellationToken);

        if (session is null)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title:
                    "El correo electrónico o la contraseña son incorrectos.");
        }

        AuthCookie.Append(context.Response, session, environment);
        return Results.Ok(session.Response);
    }

    private static async Task<IResult> RefreshAsync(
        AuthService authService,
        HttpContext context,
        IHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        if (!context.Request.Cookies.TryGetValue(
                AuthCookie.Name,
                out var refreshToken) ||
            string.IsNullOrWhiteSpace(refreshToken))
        {
            return Results.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Se requiere un token de renovación válido.");
        }

        var session = await authService.RefreshAsync(
            refreshToken,
            GetIpAddress(context),
            cancellationToken);

        if (session is null)
        {
            AuthCookie.Delete(context.Response, environment);
            return Results.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "El token de renovación no es válido o venció.");
        }

        AuthCookie.Append(context.Response, session, environment);
        return Results.Ok(session.Response);
    }

    private static async Task<IResult> LogoutAsync(
        AuthService authService,
        HttpContext context,
        IHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        context.Request.Cookies.TryGetValue(
            AuthCookie.Name,
            out var refreshToken);

        await authService.LogoutAsync(
            refreshToken,
            GetIpAddress(context),
            cancellationToken);

        AuthCookie.Delete(context.Response, environment);
        return Results.NoContent();
    }

    private static async Task<IResult> GetCurrentUserAsync(
        ClaimsPrincipal principal,
        AuthService authService,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var userId))
        {
            return Results.Unauthorized();
        }

        var user = await authService.GetCurrentUserAsync(
            userId,
            cancellationToken);

        return user is null
            ? Results.NotFound()
            : Results.Ok(user);
    }

    private static Dictionary<string, string[]> ToErrors(
        IdentityResult result)
    {
        return result.Errors
            .GroupBy(error => error.Code)
            .ToDictionary(
                group => group.Key,
                group => group
                    .Select(TranslateIdentityError)
                    .Distinct()
                    .ToArray());
    }

    private static string TranslateIdentityError(IdentityError error)
    {
        return error.Code switch
        {
            "DuplicateEmail" or "DuplicateUserName" =>
                "Ya existe una cuenta con ese correo electrónico.",
            "InvalidEmail" or "InvalidUserName" =>
                "El correo electrónico no es válido.",
            "PasswordTooShort" =>
                "La contraseña es demasiado corta.",
            "PasswordRequiresUpper" =>
                "La contraseña debe contener una letra mayúscula.",
            "PasswordRequiresLower" =>
                "La contraseña debe contener una letra minúscula.",
            "PasswordRequiresDigit" =>
                "La contraseña debe contener un número.",
            "PasswordRequiresNonAlphanumeric" =>
                "La contraseña debe contener un carácter especial.",
            "PasswordRequiresUniqueChars" =>
                "La contraseña no tiene suficientes caracteres diferentes.",
            "InvalidToken" =>
                "El enlace de recuperación no es válido o ya venció.",
            "PasswordMismatch" =>
                "La contraseña actual es incorrecta.",
            "UserNotFound" =>
                "No pudimos encontrar la cuenta asociada a tu sesión.",
            _ => "No pudimos completar la solicitud con los datos ingresados."
        };
    }

    private static string? GetIpAddress(HttpContext context)
    {
        return context.Connection.RemoteIpAddress?.ToString();
    }
}
