using LoadoutQueue.Api.Domain.Entities;
using LoadoutQueue.Api.Domain.Enums;
using LoadoutQueue.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LoadoutQueue.Api.Features.GearItems;

public sealed class GearItemService(
    ApplicationDbContext database,
    TimeProvider timeProvider)
{
    public async Task<List<GearItemListResponse>?> GetAllAsync(
        Guid ownerId,
        Guid listId,
        CancellationToken cancellationToken)
    {
        if (!await IsOwnedActiveListAsync(
                ownerId,
                listId,
                cancellationToken))
        {
            return null;
        }

        return await database.GearItems
            .AsNoTracking()
            .Where(item => item.GearListId == listId)
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
                item.Version,
                item.Photos.Count))
            .ToListAsync(cancellationToken);
    }

    public Task<GearItemDetailResponse?> GetAsync(
        Guid ownerId,
        Guid listId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        return database.GearItems
            .AsNoTracking()
            .Where(item =>
                item.Id == itemId &&
                item.GearListId == listId &&
                item.GearList.OwnerId == ownerId &&
                !item.GearList.IsArchived)
            .Select(item => new GearItemDetailResponse(
                item.Id,
                item.GearListId,
                item.Name,
                item.Description,
                item.Category,
                item.Priority,
                item.Status,
                item.EstimatedPrice,
                item.ActualPrice,
                item.ProductUrl,
                item.ImageUrl,
                item.StoreName,
                item.Notes,
                item.Position,
                item.CreatedAt,
                item.UpdatedAt,
                item.PurchasedAt,
                item.Version,
                item.Photos.Count))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<GearItemDetailResponse?> CreateAsync(
        Guid ownerId,
        Guid listId,
        CreateGearItemRequest request,
        CancellationToken cancellationToken)
    {
        if (!await IsOwnedActiveListAsync(
                ownerId,
                listId,
                cancellationToken))
        {
            return null;
        }

        var now = GetCurrentTime();
        var item = new GearItem
        {
            Id = Guid.NewGuid(),
            GearListId = listId,
            Position = await GetNextPositionAsync(
                listId,
                request.Priority,
                cancellationToken),
            CreatedAt = now,
            UpdatedAt = now,
            Version = Guid.NewGuid()
        };

        ApplyEditableFields(item, request, now);

        database.GearItems.Add(item);
        await database.SaveChangesAsync(cancellationToken);
        return ToDetailResponse(item);
    }

    internal async Task<GearItemMutationResult> UpdateAsync(
        Guid ownerId,
        Guid listId,
        Guid itemId,
        UpdateGearItemRequest request,
        CancellationToken cancellationToken)
    {
        var item = await FindOwnedItemAsync(
            ownerId,
            listId,
            itemId,
            cancellationToken);

        if (item is null)
        {
            return GearItemMutationResult.NotFound();
        }

        if (item.Version != request.Version)
        {
            return GearItemMutationResult.Conflict(ToDetailResponse(item));
        }

        var now = GetCurrentTime();

        if (item.Priority != request.Priority)
        {
            item.Position = await GetNextPositionAsync(
                listId,
                request.Priority,
                cancellationToken);
        }

        ApplyEditableFields(item, request, now);
        item.UpdatedAt = now;
        item.Version = Guid.NewGuid();

        return await SaveMutationAsync(
            ownerId,
            listId,
            itemId,
            item,
            cancellationToken);
    }

    internal async Task<GearItemMutationResult> UpdateStatusAsync(
        Guid ownerId,
        Guid listId,
        Guid itemId,
        UpdateGearItemStatusRequest request,
        CancellationToken cancellationToken)
    {
        var item = await FindOwnedItemAsync(
            ownerId,
            listId,
            itemId,
            cancellationToken);

        if (item is null)
        {
            return GearItemMutationResult.NotFound();
        }

        if (item.Version != request.Version)
        {
            return GearItemMutationResult.Conflict(ToDetailResponse(item));
        }

        var now = GetCurrentTime();
        item.PurchasedAt = ResolvePurchasedAt(
            item.Status,
            request.Status,
            item.PurchasedAt,
            now);
        item.Status = request.Status;
        item.ActualPrice = request.ActualPrice;
        item.UpdatedAt = now;
        item.Version = Guid.NewGuid();

        return await SaveMutationAsync(
            ownerId,
            listId,
            itemId,
            item,
            cancellationToken);
    }

    public async Task<bool> DeleteAsync(
        Guid ownerId,
        Guid listId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var item = await FindOwnedItemAsync(ownerId, listId, itemId, cancellationToken);
        if (item is null) return false;
        foreach (var photo in item.Photos.Where(p => p.ExternalUrl == null))
        {
            database.PhotoDeletions.Add(new PhotoDeletion { ObjectKey = photo.ObjectKey });
            database.PhotoDeletions.Add(new PhotoDeletion { ObjectKey = photo.ThumbnailKey });
        }
        database.GearItems.Remove(item);
        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    private Task<GearItem?> FindOwnedItemAsync(
        Guid ownerId,
        Guid listId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        return database.GearItems
            .Include(item => item.Photos)
            .SingleOrDefaultAsync(
                item =>
                    item.Id == itemId &&
                    item.GearListId == listId &&
                    item.GearList.OwnerId == ownerId &&
                    !item.GearList.IsArchived,
                cancellationToken);
    }

    private Task<bool> IsOwnedActiveListAsync(
        Guid ownerId,
        Guid listId,
        CancellationToken cancellationToken)
    {
        return database.GearLists.AnyAsync(
            list =>
                list.Id == listId &&
                list.OwnerId == ownerId &&
                !list.IsArchived,
            cancellationToken);
    }

    private async Task<int> GetNextPositionAsync(
        Guid listId,
        PurchasePriority priority,
        CancellationToken cancellationToken)
    {
        var lastPosition = await database.GearItems
            .Where(item =>
                item.GearListId == listId &&
                item.Priority == priority)
            .Select(item => (int?)item.Position)
            .MaxAsync(cancellationToken);

        return (lastPosition ?? -1) + 1;
    }

    private async Task<GearItemMutationResult> SaveMutationAsync(
        Guid ownerId,
        Guid listId,
        Guid itemId,
        GearItem item,
        CancellationToken cancellationToken)
    {
        try
        {
            await database.SaveChangesAsync(cancellationToken);
            return GearItemMutationResult.Success(ToDetailResponse(item));
        }
        catch (DbUpdateConcurrencyException)
        {
            database.ChangeTracker.Clear();
            var current = await GetAsync(
                ownerId,
                listId,
                itemId,
                cancellationToken);

            return current is null
                ? GearItemMutationResult.NotFound()
                : GearItemMutationResult.Conflict(current);
        }
    }

    private static void ApplyEditableFields(
        GearItem item,
        CreateGearItemRequest request,
        DateTimeOffset now)
    {
        item.Name = request.Name.Trim();
        item.Description = Normalize(request.Description);
        item.Category = request.Category;
        item.Priority = request.Priority;
        item.PurchasedAt = ResolvePurchasedAt(
            item.Status,
            request.Status,
            item.PurchasedAt,
            now);
        item.Status = request.Status;
        item.EstimatedPrice = request.EstimatedPrice;
        item.ActualPrice = request.ActualPrice;
        item.ProductUrl = Normalize(request.ProductUrl);
        item.ImageUrl = Normalize(request.ImageUrl);
        item.StoreName = Normalize(request.StoreName);
        item.Notes = Normalize(request.Notes);
    }

    private static void ApplyEditableFields(
        GearItem item,
        UpdateGearItemRequest request,
        DateTimeOffset now)
    {
        item.Name = request.Name.Trim();
        item.Description = Normalize(request.Description);
        item.Category = request.Category;
        item.Priority = request.Priority;
        item.PurchasedAt = ResolvePurchasedAt(
            item.Status,
            request.Status,
            item.PurchasedAt,
            now);
        item.Status = request.Status;
        item.EstimatedPrice = request.EstimatedPrice;
        item.ActualPrice = request.ActualPrice;
        item.ProductUrl = Normalize(request.ProductUrl);
        item.ImageUrl = Normalize(request.ImageUrl);
        item.StoreName = Normalize(request.StoreName);
        item.Notes = Normalize(request.Notes);
    }

    private static DateTimeOffset? ResolvePurchasedAt(
        PurchaseStatus previousStatus,
        PurchaseStatus nextStatus,
        DateTimeOffset? purchasedAt,
        DateTimeOffset now)
    {
        if (nextStatus != PurchaseStatus.Purchased)
        {
            return null;
        }

        return previousStatus == PurchaseStatus.Purchased &&
            purchasedAt is not null
                ? purchasedAt
                : now;
    }

    private static GearItemDetailResponse ToDetailResponse(GearItem item)
    {
        return new GearItemDetailResponse(
            item.Id,
            item.GearListId,
            item.Name,
            item.Description,
            item.Category,
            item.Priority,
            item.Status,
            item.EstimatedPrice,
            item.ActualPrice,
            item.ProductUrl,
            item.ImageUrl,
            item.StoreName,
            item.Notes,
            item.Position,
            item.CreatedAt,
            item.UpdatedAt,
            item.PurchasedAt,
            item.Version,
            item.Photos.Count);
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private DateTimeOffset GetCurrentTime()
    {
        var now = timeProvider.GetUtcNow();
        return new DateTimeOffset(
            now.Ticks - (now.Ticks % TimeSpan.TicksPerMicrosecond),
            now.Offset);
    }
}

internal enum GearItemMutationOutcome
{
    Success,
    NotFound,
    Conflict
}

internal sealed record GearItemMutationResult(
    GearItemMutationOutcome Outcome,
    GearItemDetailResponse? Item)
{
    public static GearItemMutationResult Success(
        GearItemDetailResponse item)
    {
        return new GearItemMutationResult(
            GearItemMutationOutcome.Success,
            item);
    }

    public static GearItemMutationResult NotFound()
    {
        return new GearItemMutationResult(
            GearItemMutationOutcome.NotFound,
            null);
    }

    public static GearItemMutationResult Conflict(
        GearItemDetailResponse item)
    {
        return new GearItemMutationResult(
            GearItemMutationOutcome.Conflict,
            item);
    }
}
