using System.Security.Claims;
using FluentValidation;
using LoadoutQueue.Api.Common.Errors;
using LoadoutQueue.Api.Common.Security;

namespace LoadoutQueue.Api.Features.GearLists;

public static class GearListEndpoints
{
    public static IEndpointRouteBuilder MapGearListEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/gear-lists")
            .WithTags("Gear Lists")
            .RequireAuthorization();

        group.MapGet("/", GetAllAsync)
            .WithName("GetGearLists")
            .Produces<List<GearListListResponse>>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/{id:guid}", GetAsync)
            .WithName("GetGearList")
            .Produces<GearListDetailResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", CreateAsync)
            .WithName("CreateGearList")
            .Produces<GearListDetailResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPut("/{id:guid}", UpdateAsync)
            .WithName("UpdateGearList")
            .Produces<GearListDetailResponse>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", ArchiveAsync)
            .WithName("ArchiveGearList")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static async Task<IResult> GetAllAsync(
        ClaimsPrincipal principal,
        GearListService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var lists = await service.GetAllAsync(ownerId, cancellationToken);
        return Results.Ok(lists);
    }

    private static async Task<IResult> GetAsync(
        Guid id,
        ClaimsPrincipal principal,
        GearListService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var list = await service.GetAsync(ownerId, id, cancellationToken);
        return list is null
            ? Results.NotFound()
            : Results.Ok(list);
    }

    private static async Task<IResult> CreateAsync(
        CreateGearListRequest request,
        ClaimsPrincipal principal,
        IValidator<CreateGearListRequest> validator,
        GearListService service,
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

        var list = await service.CreateAsync(
            ownerId,
            request,
            cancellationToken);

        return Results.CreatedAtRoute(
            "GetGearList",
            new { id = list.Id },
            list);
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        UpdateGearListRequest request,
        ClaimsPrincipal principal,
        IValidator<UpdateGearListRequest> validator,
        GearListService service,
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

        var list = await service.UpdateAsync(
            ownerId,
            id,
            request,
            cancellationToken);

        return list is null
            ? Results.NotFound()
            : Results.Ok(list);
    }

    private static async Task<IResult> ArchiveAsync(
        Guid id,
        ClaimsPrincipal principal,
        GearListService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var archived = await service.ArchiveAsync(
            ownerId,
            id,
            cancellationToken);

        return archived
            ? Results.NoContent()
            : Results.NotFound();
    }

}
