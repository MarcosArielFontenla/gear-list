using System.Security.Claims;
using System.Text.Json;
using FluentValidation;
using LoadoutQueue.Api.Common.Errors;
using LoadoutQueue.Api.Common.Security;
using LoadoutQueue.Api.Domain.Entities;
using LoadoutQueue.Api.Persistence;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;

namespace LoadoutQueue.Api.Features.GearItems;

public sealed record GearItemPhotoResponse(Guid Id, string Url, string ThumbnailUrl, int Width, int Height);
public static class GearItemPhotoEndpoints
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static IEndpointRouteBuilder MapGearItemPhotoEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/gear-lists/{listId:guid}/items")
            .WithTags("Gear Item Photos").RequireAuthorization();
        group.MapGet("/{itemId:guid}/photos", GetPhotosAsync);
        group.MapPost("/with-photos", (Guid listId, HttpContext context, ApplicationDbContext db,
            GearItemService service, IPhotoStorage storage, CancellationToken token) =>
                SaveAsync(listId, null, context, db, service, storage, token));
        group.MapPut("/{itemId:guid}/with-photos", (Guid listId, Guid itemId, HttpContext context,
            ApplicationDbContext db, GearItemService service, IPhotoStorage storage, CancellationToken token) =>
                SaveAsync(listId, itemId, context, db, service, storage, token));
        return endpoints;
    }

    private static async Task<IResult> GetPhotosAsync(Guid listId, Guid itemId, ClaimsPrincipal principal,
        HttpResponse response, ApplicationDbContext db, IPhotoStorage storage, CancellationToken token)
    {
        if (!principal.TryGetUserId(out var ownerId)) return Results.Unauthorized();
        if (!await db.GearItems.AnyAsync(i => i.Id == itemId && i.GearListId == listId &&
            i.GearList.OwnerId == ownerId && !i.GearList.IsArchived, token)) return Results.NotFound();
        response.Headers.CacheControl = "private, no-store";
        var photos = await db.GearItemPhotos.AsNoTracking().Where(p => p.GearItemId == itemId)
            .OrderBy(p => p.Position).ToListAsync(token);
        if (photos.Any(p => p.ExternalUrl == null) && !storage.IsConfigured) return Unavailable();
        var result = new List<GearItemPhotoResponse>();
        foreach (var photo in photos)
            result.Add(new(photo.Id, photo.ExternalUrl ?? await storage.GetUrlAsync(photo.ObjectKey),
                photo.ExternalUrl ?? await storage.GetUrlAsync(photo.ThumbnailKey), photo.Width, photo.Height));
        return Results.Ok(result);
    }

    private static IResult Unavailable() => Results.Problem(statusCode: 503,
        title: "La carga de fotos no está disponible en este momento. Intenta nuevamente más tarde.");
    private static IResult Invalid(string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { ["photos"] = [message] });

    private static async Task<IResult> SaveAsync(Guid listId, Guid? itemId, HttpContext context,
        ApplicationDbContext db, GearItemService service, IPhotoStorage storage, CancellationToken token)
    {
        if (!context.User.TryGetUserId(out var ownerId)) return Results.Unauthorized();
        if (!await db.GearLists.AnyAsync(l => l.Id == listId && l.OwnerId == ownerId && !l.IsArchived, token))
            return Results.NotFound();
        var existing = itemId.HasValue ? await db.GearItems.AsNoTracking().Include(i => i.Photos)
            .SingleOrDefaultAsync(i => i.Id == itemId && i.GearListId == listId, token) : null;
        if (itemId.HasValue && existing is null) return Results.NotFound();
        if (!context.Request.HasFormContentType) return Invalid("Selecciona las fotos y vuelve a guardar.");

        var sizeFeature = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (sizeFeature is { IsReadOnly: false }) sizeFeature.MaxRequestBodySize = 80 * 1024 * 1024;
        IFormCollection form;
        try { form = await context.Request.ReadFormAsync(token); }
        catch (InvalidDataException) { return Invalid("La selección de fotos es demasiado grande."); }

        CreateGearItemRequest? create = null;
        UpdateGearItemRequest? update = null;
        string[] order;
        try
        {
            order = JsonSerializer.Deserialize<string[]>(form["photoOrder"].ToString(), Json) ?? [];
            if (itemId.HasValue)
                update = JsonSerializer.Deserialize<UpdateGearItemRequest>(form["input"].ToString(), Json);
            else
                create = JsonSerializer.Deserialize<CreateGearItemRequest>(form["input"].ToString(), Json);
        }
        catch (JsonException) { return Invalid("Los datos del producto o las fotos no son válidos."); }
        if (create is null && update is null) return Invalid("Faltan los datos del producto.");
        var validation = update is not null
            ? await context.RequestServices.GetRequiredService<IValidator<UpdateGearItemRequest>>().ValidateAsync(update, token)
            : await context.RequestServices.GetRequiredService<IValidator<CreateGearItemRequest>>().ValidateAsync(create!, token);
        if (!validation.IsValid) return Results.ValidationProblem(validation.ToProblemDetailsErrors());
        if (update is not null && existing!.Version != update.Version)
            return Results.Conflict(new GearItemConflictResponse(
                "El accesorio fue modificado desde otra sesión. Cierra y vuelve a abrir el editor.",
                (await service.GetAsync(ownerId, listId, itemId!.Value, token))!));

        var files = form.Files;
        var legacyUrl = update?.ImageUrl ?? create?.ImageUrl;
        if (order.Length > 6 ||
            order.Distinct().Count() != order.Length || files.Count > 6)
            return Invalid("Puedes guardar hasta 6 fotos por producto.");
        var oldPhotos = existing?.Photos.ToDictionary(p => p.Id.ToString()) ?? [];
        var newNames = files.Select((_, index) => "new-" + index).ToArray();
        if (order.Any(id => !oldPhotos.ContainsKey(id) && !newNames.Contains(id) && !(id == "legacy" && !string.IsNullOrWhiteSpace(legacyUrl))) ||
            newNames.Any(id => !order.Contains(id)))
            return Invalid("La selección de fotos cambió. Vuelve a abrir el editor.");
        if (files.Count > 0 && !storage.IsConfigured) return Unavailable();

        if (update is not null) update = update with { ImageUrl = null };
        if (create is not null) create = create with { ImageUrl = null };

        var processed = new List<ProcessedPhoto>();
        try
        {
            foreach (var file in files) processed.Add(await PhotoProcessor.ProcessAsync(file, token));
        }
        catch (PhotoValidationException error) { return Invalid(error.Message); }

        var uploadedKeys = new List<string>();
        var committed = false;
        try
        {
            var additions = new Dictionary<string, GearItemPhoto>();
            if (order.Contains("legacy")) additions.Add("legacy", new GearItemPhoto { Id = Guid.NewGuid(), ExternalUrl = legacyUrl });
            for (var index = 0; index < processed.Count; index++)
            {
                var id = Guid.NewGuid();
                var key = $"products/{ownerId}/{id}";
                var photo = new GearItemPhoto {
                    Id = id, ObjectKey = key + ".webp", ThumbnailKey = key + "-thumb.webp",
                    Width = processed[index].Width, Height = processed[index].Height
                };
                uploadedKeys.Add(photo.ObjectKey);
                uploadedKeys.Add(photo.ThumbnailKey);
                // Record recovery before uploading, including crashes during a request.
                db.PhotoDeletions.Add(new PhotoDeletion { ObjectKey = photo.ObjectKey, NotBefore = DateTimeOffset.UtcNow.AddHours(1) });
                db.PhotoDeletions.Add(new PhotoDeletion { ObjectKey = photo.ThumbnailKey, NotBefore = DateTimeOffset.UtcNow.AddHours(1) });
                await db.SaveChangesAsync(token);
                await storage.PutAsync(photo.ObjectKey, processed[index].Image, token);
                await storage.PutAsync(photo.ThumbnailKey, processed[index].Thumbnail, token);
                additions.Add("new-" + index, photo);
            }

            await using (var transaction = await db.Database.BeginTransactionAsync(token))
            {
                GearItemDetailResponse saved;
                if (update is not null)
                {
                    var mutation = await service.UpdateAsync(ownerId, listId, itemId!.Value, update, token);
                    if (mutation.Outcome == GearItemMutationOutcome.NotFound) return Results.NotFound();
                    if (mutation.Outcome == GearItemMutationOutcome.Conflict)
                        return Results.Conflict(new GearItemConflictResponse(
                            "El accesorio fue modificado desde otra sesión.", mutation.Item!));
                    saved = mutation.Item!;
                }
                else
                {
                    var created = await service.CreateAsync(ownerId, listId, create!, token);
                    if (created is null) return Results.NotFound();
                    saved = created;
                }

                var tracked = await db.GearItemPhotos.Where(p => p.GearItemId == saved.Id).ToListAsync(token);
                foreach (var old in tracked.Where(p => !order.Contains(p.Id.ToString())))
                {
                    if (old.ExternalUrl is null)
                    {
                        db.PhotoDeletions.Add(new PhotoDeletion { ObjectKey = old.ObjectKey });
                        db.PhotoDeletions.Add(new PhotoDeletion { ObjectKey = old.ThumbnailKey });
                    }
                    db.GearItemPhotos.Remove(old);
                }
                for (var position = 0; position < order.Length; position++)
                {
                    if (additions.TryGetValue(order[position], out var added))
                    {
                        added.GearItemId = saved.Id;
                        added.Position = position;
                        db.GearItemPhotos.Add(added);
                    }
                    else tracked.Single(p => p.Id.ToString() == order[position]).Position = position;
                }
                var recovery = await db.PhotoDeletions.Where(p => uploadedKeys.Contains(p.ObjectKey)).ToListAsync(token);
                db.PhotoDeletions.RemoveRange(recovery);
                await db.SaveChangesAsync(token);
                await transaction.CommitAsync(token);
                committed = true;
                return Results.Ok(saved with { PhotoCount = order.Length });
            }
        }
        catch (Amazon.S3.AmazonS3Exception)
        {
            return Unavailable();
        }
        finally
        {
            if (!committed && uploadedKeys.Count > 0)
            {
                // A separate scope persists cleanup even after a failed request/transaction.
                try
                {
                    await using var scope = context.RequestServices.CreateAsyncScope();
                    var cleanupDb = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    await cleanupDb.PhotoDeletions.Where(p => uploadedKeys.Contains(p.ObjectKey))
                        .ExecuteUpdateAsync(setters => setters.SetProperty(p => p.NotBefore, DateTimeOffset.UtcNow), CancellationToken.None);
                }
                catch (Exception error)
                {
                    context.RequestServices.GetRequiredService<ILogger<PhotoCleanupWorker>>()
                        .LogError(error, "Could not queue cleanup for an unsuccessful photo upload.");
                }
            }
        }
    }
}
