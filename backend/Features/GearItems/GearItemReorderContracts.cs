using LoadoutQueue.Api.Domain.Enums;

namespace LoadoutQueue.Api.Features.GearItems;

public sealed record ReorderGearItemRequest(
    Guid ItemId,
    PurchasePriority Priority,
    int Position,
    Guid Version);

public sealed record ReorderGearItemsRequest(
    IReadOnlyList<ReorderGearItemRequest> Items);

public sealed record ReorderGearItemsResponse(
    IReadOnlyList<GearItemListResponse> Items);

public sealed record ReorderGearItemsConflictResponse(
    string Message,
    IReadOnlyList<GearItemListResponse> Current);
