namespace LoadoutQueue.Api.Features.GearLists;

public sealed record CreateGearListRequest(
    string Name,
    string? Description);

public sealed record UpdateGearListRequest(
    string Name,
    string? Description);

public sealed record GearListListResponse(
    Guid Id,
    string Name,
    string? Description,
    int ItemCount,
    int PurchasedItemCount,
    decimal TotalEstimated,
    DateTimeOffset UpdatedAt);

public sealed record GearListDetailResponse(
    Guid Id,
    string Name,
    string? Description,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
