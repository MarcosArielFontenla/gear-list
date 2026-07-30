using LoadoutQueue.Api.Domain.Enums;
using LoadoutQueue.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LoadoutQueue.Api.Features.Dashboard;

public sealed class DashboardService(ApplicationDbContext database)
{
    public async Task<DashboardSummaryResponse> GetSummaryAsync(
        Guid ownerId,
        CancellationToken cancellationToken)
    {
        var lists = database.GearLists
            .AsNoTracking()
            .Where(list => list.OwnerId == ownerId && !list.IsArchived);
        var items = database.GearItems
            .AsNoTracking()
            .Where(item =>
                item.GearList.OwnerId == ownerId &&
                !item.GearList.IsArchived);

        var listCount = await lists.CountAsync(cancellationToken);
        var pendingItemCount = await items.CountAsync(
            item =>
                item.Status != PurchaseStatus.Purchased &&
                item.Status != PurchaseStatus.Cancelled,
            cancellationToken);
        var purchasedItemCount = await items.CountAsync(
            item => item.Status == PurchaseStatus.Purchased,
            cancellationToken);
        var totalEstimated = await items
            .Where(item => item.Status != PurchaseStatus.Cancelled)
            .SumAsync(item => item.EstimatedPrice ?? 0, cancellationToken);
        var nextPurchase = await ProjectNextPurchase(items)
            .FirstOrDefaultAsync(cancellationToken);
        var recentLists = await lists
            .OrderByDescending(list => list.UpdatedAt)
            .ThenBy(list => list.Name)
            .Take(3)
            .Select(list => new RecentGearListResponse(
                list.Id,
                list.Name,
                list.Description,
                list.Items.Count,
                list.Items.Count(item =>
                    item.Status == PurchaseStatus.Purchased),
                list.Items
                    .Where(item => item.Status != PurchaseStatus.Cancelled)
                    .Sum(item => item.EstimatedPrice ?? 0),
                list.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new DashboardSummaryResponse(
            listCount,
            pendingItemCount,
            purchasedItemCount,
            totalEstimated,
            nextPurchase,
            recentLists);
    }

    public async Task<GearListSummaryResponse?> GetListSummaryAsync(
        Guid ownerId,
        Guid listId,
        CancellationToken cancellationToken)
    {
        var exists = await database.GearLists
            .AsNoTracking()
            .AnyAsync(
                list =>
                    list.Id == listId &&
                    list.OwnerId == ownerId &&
                    !list.IsArchived,
                cancellationToken);

        if (!exists)
        {
            return null;
        }

        var items = database.GearItems
            .AsNoTracking()
            .Where(item => item.GearListId == listId);
        var aggregates = await items
            .GroupBy(_ => 1)
            .Select(group => new
            {
                ItemCount = group.Count(),
                PendingItemCount = group.Count(item =>
                    item.Status != PurchaseStatus.Purchased &&
                    item.Status != PurchaseStatus.Cancelled),
                PurchasedItemCount = group.Count(item =>
                    item.Status == PurchaseStatus.Purchased),
                TotalEstimated = group
                    .Where(item => item.Status != PurchaseStatus.Cancelled)
                    .Sum(item => item.EstimatedPrice ?? 0),
                BuyNowEstimated = group
                    .Where(item =>
                        item.Priority == PurchasePriority.BuyNow &&
                        item.Status != PurchaseStatus.Cancelled &&
                        item.Status != PurchaseStatus.Purchased)
                    .Sum(item => item.EstimatedPrice ?? 0),
                ActualSpent = group
                    .Where(item => item.Status == PurchaseStatus.Purchased)
                    .Sum(item => item.ActualPrice ?? 0),
                PurchasedEstimated = group
                    .Where(item => item.Status == PurchaseStatus.Purchased)
                    .Sum(item => item.EstimatedPrice ?? 0)
            })
            .SingleOrDefaultAsync(cancellationToken);
        var nextPurchase = await ProjectNextPurchase(items)
            .FirstOrDefaultAsync(cancellationToken);

        var itemCount = aggregates?.ItemCount ?? 0;
        var pending = aggregates?.PendingItemCount ?? 0;
        var purchased = aggregates?.PurchasedItemCount ?? 0;
        var estimated = aggregates?.TotalEstimated ?? 0;
        var buyNow = aggregates?.BuyNowEstimated ?? 0;
        var actual = aggregates?.ActualSpent ?? 0;
        var purchasedEstimated = aggregates?.PurchasedEstimated ?? 0;

        return new GearListSummaryResponse(
            listId,
            itemCount,
            pending,
            purchased,
            estimated,
            buyNow,
            actual,
            actual - purchasedEstimated,
            nextPurchase);
    }

    public Task<List<PurchasedItemResponse>> GetPurchasesAsync(
        Guid ownerId,
        CancellationToken cancellationToken)
    {
        return database.GearItems
            .AsNoTracking()
            .Where(item =>
                item.GearList.OwnerId == ownerId &&
                !item.GearList.IsArchived &&
                item.Status == PurchaseStatus.Purchased &&
                item.PurchasedAt != null)
            .OrderByDescending(item => item.PurchasedAt)
            .ThenBy(item => item.Name)
            .Select(item => new PurchasedItemResponse(
                item.Id,
                item.GearListId,
                item.GearList.Name,
                item.Name,
                item.Category,
                item.EstimatedPrice,
                item.ActualPrice,
                (item.ActualPrice ?? 0) - (item.EstimatedPrice ?? 0),
                item.PurchasedAt!.Value,
                item.StoreName,
                item.ProductUrl))
            .ToListAsync(cancellationToken);
    }

    private static IQueryable<NextPurchaseResponse> ProjectNextPurchase(
        IQueryable<Domain.Entities.GearItem> items)
    {
        return items
            .Where(item =>
                item.Status != PurchaseStatus.Purchased &&
                item.Status != PurchaseStatus.Cancelled)
            .OrderBy(item => item.Priority)
            .ThenBy(item => item.Position)
            .ThenBy(item => item.CreatedAt)
            .Select(item => new NextPurchaseResponse(
                item.Id,
                item.GearListId,
                item.GearList.Name,
                item.Name,
                item.Category,
                item.EstimatedPrice,
                item.StoreName));
    }
}
