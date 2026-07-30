using LoadoutQueue.Api.Domain.Entities;
using LoadoutQueue.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LoadoutQueue.Api.Features.GearItems;

public sealed class GearItemReorderService(
    ApplicationDbContext database,
    TimeProvider timeProvider)
{
    internal async Task<GearItemReorderResult> ReorderAsync(
        Guid ownerId,
        Guid listId,
        ReorderGearItemsRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await database.Database
            .BeginTransactionAsync(cancellationToken);

        var list = await database.GearLists
            .SingleOrDefaultAsync(
                candidate =>
                    candidate.Id == listId &&
                    candidate.OwnerId == ownerId &&
                    !candidate.IsArchived,
                cancellationToken);

        if (list is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return GearItemReorderResult.NotFound();
        }

        var currentItems = await database.GearItems
            .Where(item => item.GearListId == listId)
            .ToListAsync(cancellationToken);

        var requestedIds = request.Items
            .Select(item => item.ItemId)
            .ToHashSet();
        var currentIds = currentItems
            .Select(item => item.Id)
            .ToHashSet();

        if (!requestedIds.SetEquals(currentIds))
        {
            await transaction.RollbackAsync(cancellationToken);
            return GearItemReorderResult.Conflict(
                ToListResponses(currentItems));
        }

        var currentById = currentItems.ToDictionary(item => item.Id);
        var hasStaleVersion = request.Items.Any(
            requested => currentById[requested.ItemId].Version !=
                requested.Version);

        if (hasStaleVersion)
        {
            await transaction.RollbackAsync(cancellationToken);
            return GearItemReorderResult.Conflict(
                ToListResponses(currentItems));
        }

        var now = GetCurrentTime();

        foreach (var requested in request.Items)
        {
            var item = currentById[requested.ItemId];
            item.Priority = requested.Priority;
            item.Position = requested.Position;
            item.UpdatedAt = now;
            item.Version = Guid.NewGuid();
        }

        list.UpdatedAt = now;

        try
        {
            await database.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return GearItemReorderResult.Success(
                ToListResponses(currentItems));
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync(cancellationToken);
            database.ChangeTracker.Clear();

            var listStillExists = await database.GearLists
                .AsNoTracking()
                .AnyAsync(
                    candidate =>
                        candidate.Id == listId &&
                        candidate.OwnerId == ownerId &&
                        !candidate.IsArchived,
                    cancellationToken);

            if (!listStillExists)
            {
                return GearItemReorderResult.NotFound();
            }

            var latestItems = await database.GearItems
                .AsNoTracking()
                .Where(item => item.GearListId == listId)
                .ToListAsync(cancellationToken);

            return GearItemReorderResult.Conflict(
                ToListResponses(latestItems));
        }
    }

    private static List<GearItemListResponse> ToListResponses(
        IEnumerable<GearItem> items)
    {
        return items
            .OrderBy(item => item.Priority)
            .ThenBy(item => item.Position)
            .ThenBy(item => item.CreatedAt)
            .Select(item => new GearItemListResponse(
                item.Id,
                item.GearListId,
                item.Name,
                item.Category,
                item.Priority,
                item.Status,
                item.EstimatedPrice,
                item.ActualPrice,
                item.ProductUrl,
                item.ImageUrl,
                item.StoreName,
                item.Position,
                item.UpdatedAt,
                item.PurchasedAt,
                item.Version))
            .ToList();
    }

    private DateTimeOffset GetCurrentTime()
    {
        var now = timeProvider.GetUtcNow();
        return new DateTimeOffset(
            now.Ticks - (now.Ticks % TimeSpan.TicksPerMicrosecond),
            now.Offset);
    }
}

internal enum GearItemReorderOutcome
{
    Success,
    NotFound,
    Conflict
}

internal sealed record GearItemReorderResult(
    GearItemReorderOutcome Outcome,
    IReadOnlyList<GearItemListResponse>? Items)
{
    public static GearItemReorderResult Success(
        IReadOnlyList<GearItemListResponse> items)
    {
        return new GearItemReorderResult(
            GearItemReorderOutcome.Success,
            items);
    }

    public static GearItemReorderResult NotFound()
    {
        return new GearItemReorderResult(
            GearItemReorderOutcome.NotFound,
            null);
    }

    public static GearItemReorderResult Conflict(
        IReadOnlyList<GearItemListResponse> items)
    {
        return new GearItemReorderResult(
            GearItemReorderOutcome.Conflict,
            items);
    }
}
