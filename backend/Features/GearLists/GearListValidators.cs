using FluentValidation;

namespace LoadoutQueue.Api.Features.GearLists;

public sealed class CreateGearListRequestValidator
    : AbstractValidator<CreateGearListRequest>
{
    public CreateGearListRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(120);

        RuleFor(request => request.Description)
            .MaximumLength(1_000);
    }
}

public sealed class UpdateGearListRequestValidator
    : AbstractValidator<UpdateGearListRequest>
{
    public UpdateGearListRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(120);

        RuleFor(request => request.Description)
            .MaximumLength(1_000);
    }
}
