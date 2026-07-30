using LoadoutQueue.Api.Domain.Enums;

namespace LoadoutQueue.Api.Domain.Entities;

public sealed class GearItem
{
    public Guid Id { get; set; }

    public Guid GearListId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public GearCategory Category { get; set; }

    public PurchasePriority Priority { get; set; }

    public PurchaseStatus Status { get; set; }

    public decimal? EstimatedPrice { get; set; }

    public decimal? ActualPrice { get; set; }

    public string? ProductUrl { get; set; }

    public string? ImageUrl { get; set; }

    public string? StoreName { get; set; }

    public string? Notes { get; set; }

    public int Position { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public DateTimeOffset? PurchasedAt { get; set; }

    public Guid Version { get; set; }

    public GearList GearList { get; set; } = null!;
}
