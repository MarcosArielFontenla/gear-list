using System.Security.Claims;
using FluentValidation;
using LoadoutQueue.Api.Common.Errors;
using LoadoutQueue.Api.Common.Security;

namespace LoadoutQueue.Api.Features.GearItems;

public static class GearItemEndpoints
{
    public static IEndpointRouteBuilder MapGearItemEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/gear-lists/{listId:guid}/items")
            .WithTags("Gear Items")
            .RequireAuthorization();

        group.MapGet("/", GetAllAsync)
            .WithName("GetGearItems")
            .Produces<List<GearItemListResponse>>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/{itemId:guid}", GetAsync)
            .WithName("GetGearItem")
            .Produces<GearItemDetailResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", CreateAsync)
            .WithName("CreateGearItem")
            .Produces<GearItemDetailResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPut("/reorder", ReorderAsync)
            .WithName("ReorderGearItems")
            .Produces<ReorderGearItemsResponse>()
            .Produces<ReorderGearItemsConflictResponse>(
                StatusCodes.Status409Conflict)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPut("/{itemId:guid}", UpdateAsync)
            .WithName("UpdateGearItem")
            .Produces<GearItemDetailResponse>()
            .Produces<GearItemConflictResponse>(
                StatusCodes.Status409Conflict)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{itemId:guid}", DeleteAsync)
            .WithName("DeleteGearItem")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPatch("/{itemId:guid}/status", UpdateStatusAsync)
            .WithName("UpdateGearItemStatus")
            .Produces<GearItemDetailResponse>()
            .Produces<GearItemConflictResponse>(
                StatusCodes.Status409Conflict)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static async Task<IResult> GetAllAsync(
        Guid listId,
        ClaimsPrincipal principal,
        GearItemService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var items = await service.GetAllAsync(
            ownerId,
            listId,
            cancellationToken);

        return items is null
            ? Results.NotFound()
            : Results.Ok(items);
    }

    private static async Task<IResult> GetAsync(
        Guid listId,
        Guid itemId,
        ClaimsPrincipal principal,
        GearItemService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var item = await service.GetAsync(
            ownerId,
            listId,
            itemId,
            cancellationToken);

        return item is null
            ? Results.NotFound()
            : Results.Ok(item);
    }

    private static async Task<IResult> CreateAsync(
        Guid listId,
        CreateGearItemRequest request,
        ClaimsPrincipal principal,
        IValidator<CreateGearItemRequest> validator,
        GearItemService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var validation = await validator.ValidateAsync(
            request,
            cancellationToken);

        if (!validation.IsValid)
        {
            return Results.ValidationProblem(
                validation.ToProblemDetailsErrors());
        }

        var item = await service.CreateAsync(
            ownerId,
            listId,
            request,
            cancellationToken);

        return item is null
            ? Results.NotFound()
            : Results.CreatedAtRoute(
                "GetGearItem",
                new
                {
                    listId,
                    itemId = item.Id
                },
                item);
    }

    private static async Task<IResult> UpdateAsync(
        Guid listId,
        Guid itemId,
        UpdateGearItemRequest request,
        ClaimsPrincipal principal,
        IValidator<UpdateGearItemRequest> validator,
        GearItemService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var validation = await validator.ValidateAsync(
            request,
            cancellationToken);

        if (!validation.IsValid)
        {
            return Results.ValidationProblem(
                validation.ToProblemDetailsErrors());
        }

        var result = await service.UpdateAsync(
            ownerId,
            listId,
            itemId,
            request,
            cancellationToken);

        return ToHttpResult(result);
    }

    private static async Task<IResult> ReorderAsync(
        Guid listId,
        ReorderGearItemsRequest request,
        ClaimsPrincipal principal,
        IValidator<ReorderGearItemsRequest> validator,
        GearItemReorderService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var validation = await validator.ValidateAsync(
            request,
            cancellationToken);

        if (!validation.IsValid)
        {
            return Results.ValidationProblem(
                validation.ToProblemDetailsErrors());
        }

        var result = await service.ReorderAsync(
            ownerId,
            listId,
            request,
            cancellationToken);

        return result.Outcome switch
        {
            GearItemReorderOutcome.Success => Results.Ok(
                new ReorderGearItemsResponse(result.Items!)),
            GearItemReorderOutcome.Conflict => Results.Conflict(
                new ReorderGearItemsConflictResponse(
                    "El orden de los accesorios cambió. Actualiza la lista e inténtalo de nuevo.",
                    result.Items!)),
            _ => Results.NotFound()
        };
    }

    private static async Task<IResult> UpdateStatusAsync(
        Guid listId,
        Guid itemId,
        UpdateGearItemStatusRequest request,
        ClaimsPrincipal principal,
        IValidator<UpdateGearItemStatusRequest> validator,
        GearItemService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var validation = await validator.ValidateAsync(
            request,
            cancellationToken);

        if (!validation.IsValid)
        {
            return Results.ValidationProblem(
                validation.ToProblemDetailsErrors());
        }

        var result = await service.UpdateStatusAsync(
            ownerId,
            listId,
            itemId,
            request,
            cancellationToken);

        return ToHttpResult(result);
    }

    private static async Task<IResult> DeleteAsync(
        Guid listId,
        Guid itemId,
        ClaimsPrincipal principal,
        GearItemService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var deleted = await service.DeleteAsync(
            ownerId,
            listId,
            itemId,
            cancellationToken);

        return deleted
            ? Results.NoContent()
            : Results.NotFound();
    }

    private static IResult ToHttpResult(GearItemMutationResult result)
    {
        return result.Outcome switch
        {
            GearItemMutationOutcome.Success => Results.Ok(result.Item),
            GearItemMutationOutcome.Conflict => Results.Conflict(
                new GearItemConflictResponse(
                    "El accesorio fue modificado desde otra sesión.",
                    result.Item!)),
            _ => Results.NotFound()
        };
    }
}
