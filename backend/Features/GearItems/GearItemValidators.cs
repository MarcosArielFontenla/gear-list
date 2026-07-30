using FluentValidation;

namespace LoadoutQueue.Api.Features.GearItems;

public sealed class CreateGearItemRequestValidator
    : AbstractValidator<CreateGearItemRequest>
{
    public CreateGearItemRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(160);

        RuleFor(request => request.Description)
            .MaximumLength(2_000);

        RuleFor(request => request.Category)
            .IsInEnum();

        RuleFor(request => request.Priority)
            .IsInEnum();

        RuleFor(request => request.Status)
            .IsInEnum();

        RuleFor(request => request.EstimatedPrice)
            .GreaterThanOrEqualTo(0);

        RuleFor(request => request.ActualPrice)
            .GreaterThanOrEqualTo(0);

        RuleFor(request => request.ProductUrl)
            .MaximumLength(2_048)
            .Must(BeValidHttpUrl)
            .WithMessage(
                "La URL del producto debe ser una URL HTTP o HTTPS válida.");

        RuleFor(request => request.ImageUrl)
            .MaximumLength(2_048)
            .Must(BeValidHttpUrl)
            .WithMessage(
                "La URL de la imagen debe ser una URL HTTP o HTTPS válida.");

        RuleFor(request => request.StoreName)
            .MaximumLength(120);

        RuleFor(request => request.Notes)
            .MaximumLength(4_000);
    }

    private static bool BeValidHttpUrl(string? value)
    {
        return GearItemUrlValidation.IsValid(value);
    }
}

public sealed class UpdateGearItemRequestValidator
    : AbstractValidator<UpdateGearItemRequest>
{
    public UpdateGearItemRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(160);

        RuleFor(request => request.Description)
            .MaximumLength(2_000);

        RuleFor(request => request.Category)
            .IsInEnum();

        RuleFor(request => request.Priority)
            .IsInEnum();

        RuleFor(request => request.Status)
            .IsInEnum();

        RuleFor(request => request.EstimatedPrice)
            .GreaterThanOrEqualTo(0);

        RuleFor(request => request.ActualPrice)
            .GreaterThanOrEqualTo(0);

        RuleFor(request => request.ProductUrl)
            .MaximumLength(2_048)
            .Must(GearItemUrlValidation.IsValid)
            .WithMessage(
                "La URL del producto debe ser una URL HTTP o HTTPS válida.");

        RuleFor(request => request.ImageUrl)
            .MaximumLength(2_048)
            .Must(GearItemUrlValidation.IsValid)
            .WithMessage(
                "La URL de la imagen debe ser una URL HTTP o HTTPS válida.");

        RuleFor(request => request.StoreName)
            .MaximumLength(120);

        RuleFor(request => request.Notes)
            .MaximumLength(4_000);

        RuleFor(request => request.Version)
            .NotEmpty();
    }
}

public sealed class UpdateGearItemStatusRequestValidator
    : AbstractValidator<UpdateGearItemStatusRequest>
{
    public UpdateGearItemStatusRequestValidator()
    {
        RuleFor(request => request.Status)
            .IsInEnum();

        RuleFor(request => request.ActualPrice)
            .GreaterThanOrEqualTo(0);

        RuleFor(request => request.Version)
            .NotEmpty();
    }
}

internal static class GearItemUrlValidation
{
    public static bool IsValid(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        return Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp ||
             uri.Scheme == Uri.UriSchemeHttps);
    }
}
