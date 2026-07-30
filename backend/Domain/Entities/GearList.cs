namespace LoadoutQueue.Api.Domain.Entities;

public sealed class GearList
{
    public Guid Id { get; set; }

    public Guid OwnerId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ApplicationUser Owner { get; set; } = null!;

    public ICollection<GearItem> Items { get; set; } = [];
}
