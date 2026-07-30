using System.Security.Claims;
using LoadoutQueue.Api.Common.Security;

namespace LoadoutQueue.Api.Features.Dashboard;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var dashboard = endpoints
            .MapGroup("/api/dashboard")
            .WithTags("Dashboard")
            .RequireAuthorization();

        dashboard.MapGet("/summary", GetSummaryAsync)
            .WithName("GetDashboardSummary")
            .Produces<DashboardSummaryResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        dashboard.MapGet("/purchases", GetPurchasesAsync)
            .WithName("GetPurchasedItems")
            .Produces<List<PurchasedItemResponse>>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        endpoints.MapGet(
                "/api/gear-lists/{listId:guid}/summary",
                GetListSummaryAsync)
            .WithTags("Dashboard")
            .WithName("GetGearListSummary")
            .RequireAuthorization()
            .Produces<GearListSummaryResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static async Task<IResult> GetSummaryAsync(
        ClaimsPrincipal principal,
        DashboardService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        return Results.Ok(
            await service.GetSummaryAsync(ownerId, cancellationToken));
    }

    private static async Task<IResult> GetListSummaryAsync(
        Guid listId,
        ClaimsPrincipal principal,
        DashboardService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        var summary = await service.GetListSummaryAsync(
            ownerId,
            listId,
            cancellationToken);

        return summary is null
            ? Results.NotFound()
            : Results.Ok(summary);
    }

    private static async Task<IResult> GetPurchasesAsync(
        ClaimsPrincipal principal,
        DashboardService service,
        CancellationToken cancellationToken)
    {
        if (!principal.TryGetUserId(out var ownerId))
        {
            return Results.Unauthorized();
        }

        return Results.Ok(
            await service.GetPurchasesAsync(ownerId, cancellationToken));
    }
}
