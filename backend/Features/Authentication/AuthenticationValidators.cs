using FluentValidation;

namespace LoadoutQueue.Api.Features.Authentication;

public sealed class RegisterRequestValidator
    : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(request => request.DisplayName)
            .NotEmpty()
            .MaximumLength(120);

        RuleFor(request => request.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        RuleFor(request => request.Password)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(128)
            .Matches("[A-Z]")
            .WithMessage("La contraseña debe contener una letra mayúscula.")
            .Matches("[a-z]")
            .WithMessage("La contraseña debe contener una letra minúscula.")
            .Matches("[0-9]")
            .WithMessage("La contraseña debe contener un número.");

        RuleFor(request => request.ConfirmPassword)
            .Equal(request => request.Password)
            .WithMessage("Las contraseñas deben coincidir.");
    }
}

public sealed class LoginRequestValidator
    : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(request => request.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        RuleFor(request => request.Password)
            .NotEmpty()
            .MaximumLength(128);
    }
}

public sealed class ForgotPasswordRequestValidator
    : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(request => request.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);
    }
}

public sealed class ResetPasswordRequestValidator
    : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(request => request.UserId)
            .NotEmpty();

        RuleFor(request => request.Token)
            .NotEmpty()
            .MaximumLength(4096);

        RuleFor(request => request.Password)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(128)
            .Matches("[A-Z]")
            .WithMessage("La contraseña debe contener una letra mayúscula.")
            .Matches("[a-z]")
            .WithMessage("La contraseña debe contener una letra minúscula.")
            .Matches("[0-9]")
            .WithMessage("La contraseña debe contener un número.");

        RuleFor(request => request.ConfirmPassword)
            .Equal(request => request.Password)
            .WithMessage("Las contraseñas deben coincidir.");
    }
}

public sealed class ChangePasswordRequestValidator
    : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(request => request.CurrentPassword)
            .NotEmpty()
            .MaximumLength(128);

        RuleFor(request => request.NewPassword)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(128)
            .Matches("[A-Z]")
            .WithMessage("La contraseña debe contener una letra mayúscula.")
            .Matches("[a-z]")
            .WithMessage("La contraseña debe contener una letra minúscula.")
            .Matches("[0-9]")
            .WithMessage("La contraseña debe contener un número.")
            .NotEqual(request => request.CurrentPassword)
            .WithMessage("La nueva contraseña debe ser diferente de la actual.");

        RuleFor(request => request.ConfirmPassword)
            .Equal(request => request.NewPassword)
            .WithMessage("Las contraseñas deben coincidir.");
    }
}
