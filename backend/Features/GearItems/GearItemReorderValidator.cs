using FluentValidation;

namespace LoadoutQueue.Api.Features.GearItems;

public sealed class ReorderGearItemsRequestValidator
    : AbstractValidator<ReorderGearItemsRequest>
{
    public ReorderGearItemsRequestValidator()
    {
        RuleFor(request => request.Items)
            .NotEmpty()
            .Must(HaveUniqueItemIds)
            .WithMessage("Los identificadores de los accesorios deben ser únicos.")
            .Must(HaveContiguousPositions)
            .WithMessage(
                "Las posiciones deben ser únicas y consecutivas dentro de cada prioridad.");

        RuleForEach(request => request.Items)
            .SetValidator(new ReorderGearItemRequestValidator());
    }

    private static bool HaveUniqueItemIds(
        IReadOnlyList<ReorderGearItemRequest>? items)
    {
        return items is null ||
            items.Select(item => item.ItemId).Distinct().Count() == items.Count;
    }

    private static bool HaveContiguousPositions(
        IReadOnlyList<ReorderGearItemRequest>? items)
    {
        if (items is null)
        {
            return true;
        }

        return items
            .GroupBy(item => item.Priority)
            .All(group => group
                .Select(item => item.Position)
                .Order()
                .SequenceEqual(Enumerable.Range(0, group.Count())));
    }
}

internal sealed class ReorderGearItemRequestValidator
    : AbstractValidator<ReorderGearItemRequest>
{
    public ReorderGearItemRequestValidator()
    {
        RuleFor(item => item.ItemId)
            .NotEmpty();

        RuleFor(item => item.Priority)
            .IsInEnum();

        RuleFor(item => item.Position)
            .GreaterThanOrEqualTo(0);

        RuleFor(item => item.Version)
            .NotEmpty();
    }
}
