using LoadoutQueue.Api.Domain.Enums;

namespace LoadoutQueue.Api.Features.GearItems;

public sealed record CreateGearItemRequest(
    string Name,
    string? Description,
    GearCategory Category,
    PurchasePriority Priority,
    PurchaseStatus Status,
    decimal? EstimatedPrice,
    decimal? ActualPrice,
    string? ProductUrl,
    string? ImageUrl,
    string? StoreName,
    string? Notes);

public sealed record UpdateGearItemRequest(
    string Name,
    string? Description,
    GearCategory Category,
    PurchasePriority Priority,
    PurchaseStatus Status,
    decimal? EstimatedPrice,
    decimal? ActualPrice,
    string? ProductUrl,
    string? ImageUrl,
    string? StoreName,
    string? Notes,
    Guid Version);

public sealed record UpdateGearItemStatusRequest(
    PurchaseStatus Status,
    decimal? ActualPrice,
    Guid Version);

public sealed record GearItemListResponse(
    Guid Id,
    Guid GearListId,
    string Name,
    GearCategory Category,
    PurchasePriority Priority,
    PurchaseStatus Status,
    decimal? EstimatedPrice,
    decimal? ActualPrice,
    string? ProductUrl,
    string? ImageUrl,
    string? StoreName,
    int Position,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? PurchasedAt,
    Guid Version,
    int PhotoCount = 0);

public sealed record GearItemDetailResponse(
    Guid Id,
    Guid GearListId,
    string Name,
    string? Description,
    GearCategory Category,
    PurchasePriority Priority,
    PurchaseStatus Status,
    decimal? EstimatedPrice,
    decimal? ActualPrice,
    string? ProductUrl,
    string? ImageUrl,
    string? StoreName,
    string? Notes,
    int Position,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? PurchasedAt,
    Guid Version,
    int PhotoCount = 0);

public sealed record GearItemConflictResponse(
    string Message,
    GearItemDetailResponse Current);
