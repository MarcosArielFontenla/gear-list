using LoadoutQueue.Api.Domain.Entities;
using LoadoutQueue.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LoadoutQueue.Api.Features.GearLists;

public sealed class GearListService(
    ApplicationDbContext database,
    TimeProvider timeProvider)
{
    public Task<List<GearListListResponse>> GetAllAsync(
        Guid ownerId,
        CancellationToken cancellationToken)
    {
        return database.GearLists
            .AsNoTracking()
            .Where(list => list.OwnerId == ownerId && !list.IsArchived)
            .OrderByDescending(list => list.UpdatedAt)
            .ThenBy(list => list.Name)
            .Select(list => new GearListListResponse(
                list.Id,
                list.Name,
                list.Description,
                list.Items.Count,
                list.Items.Count(item =>
                    item.Status == Domain.Enums.PurchaseStatus.Purchased),
                list.Items
                    .Where(item =>
                        item.Status != Domain.Enums.PurchaseStatus.Cancelled)
                    .Sum(item => item.EstimatedPrice ?? 0),
                list.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public Task<GearListDetailResponse?> GetAsync(
        Guid ownerId,
        Guid id,
        CancellationToken cancellationToken)
    {
        return database.GearLists
            .AsNoTracking()
            .Where(list =>
                list.Id == id &&
                list.OwnerId == ownerId &&
                !list.IsArchived)
            .Select(list => new GearListDetailResponse(
                list.Id,
                list.Name,
                list.Description,
                list.CreatedAt,
                list.UpdatedAt))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<GearListDetailResponse> CreateAsync(
        Guid ownerId,
        CreateGearListRequest request,
        CancellationToken cancellationToken)
    {
        var now = GetCurrentTime();
        var list = new GearList
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            Name = request.Name.Trim(),
            Description = NormalizeDescription(request.Description),
            CreatedAt = now,
            UpdatedAt = now
        };

        database.GearLists.Add(list);
        await database.SaveChangesAsync(cancellationToken);

        return ToDetailResponse(list);
    }

    public async Task<GearListDetailResponse?> UpdateAsync(
        Guid ownerId,
        Guid id,
        UpdateGearListRequest request,
        CancellationToken cancellationToken)
    {
        var list = await database.GearLists
            .SingleOrDefaultAsync(
                candidate =>
                    candidate.Id == id &&
                    candidate.OwnerId == ownerId &&
                    !candidate.IsArchived,
                cancellationToken);

        if (list is null)
        {
            return null;
        }

        list.Name = request.Name.Trim();
        list.Description = NormalizeDescription(request.Description);
        list.UpdatedAt = GetCurrentTime();

        await database.SaveChangesAsync(cancellationToken);
        return ToDetailResponse(list);
    }

    public async Task<bool> ArchiveAsync(
        Guid ownerId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var affectedRows = await database.GearLists
            .Where(list =>
                list.Id == id &&
                list.OwnerId == ownerId &&
                !list.IsArchived)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(list => list.IsArchived, true)
                    .SetProperty(
                        list => list.UpdatedAt,
                        GetCurrentTime()),
                cancellationToken);

        return affectedRows == 1;
    }

    private static GearListDetailResponse ToDetailResponse(GearList list)
    {
        return new GearListDetailResponse(
            list.Id,
            list.Name,
            list.Description,
            list.CreatedAt,
            list.UpdatedAt);
    }

    private static string? NormalizeDescription(string? description)
    {
        return string.IsNullOrWhiteSpace(description)
            ? null
            : description.Trim();
    }

    private DateTimeOffset GetCurrentTime()
    {
        var now = timeProvider.GetUtcNow();
        return new DateTimeOffset(
            now.Ticks - (now.Ticks % TimeSpan.TicksPerMicrosecond),
            now.Offset);
    }
}
