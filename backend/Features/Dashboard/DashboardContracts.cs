using LoadoutQueue.Api.Domain.Enums;

namespace LoadoutQueue.Api.Features.Dashboard;

public sealed record NextPurchaseResponse(
    Guid Id,
    Guid GearListId,
    string GearListName,
    string Name,
    GearCategory Category,
    decimal? EstimatedPrice,
    string? StoreName);

public sealed record RecentGearListResponse(
    Guid Id,
    string Name,
    string? Description,
    int ItemCount,
    int PurchasedItemCount,
    decimal TotalEstimated,
    DateTimeOffset UpdatedAt);

public sealed record DashboardSummaryResponse(
    int ListCount,
    int PendingItemCount,
    int PurchasedItemCount,
    decimal TotalEstimated,
    NextPurchaseResponse? NextPurchase,
    IReadOnlyList<RecentGearListResponse> RecentLists);

public sealed record GearListSummaryResponse(
    Guid GearListId,
    int ItemCount,
    int PendingItemCount,
    int PurchasedItemCount,
    decimal TotalEstimated,
    decimal BuyNowEstimated,
    decimal ActualSpent,
    decimal Difference,
    NextPurchaseResponse? NextPurchase);

public sealed record PurchasedItemResponse(
    Guid Id,
    Guid GearListId,
    string GearListName,
    string Name,
    GearCategory Category,
    decimal? EstimatedPrice,
    decimal? ActualPrice,
    decimal Difference,
    DateTimeOffset PurchasedAt,
    string? StoreName,
    string? ProductUrl);
