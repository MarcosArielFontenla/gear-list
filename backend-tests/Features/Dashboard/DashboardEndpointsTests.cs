using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using LoadoutQueue.Api.Domain.Enums;
using LoadoutQueue.Api.Features.Authentication;
using LoadoutQueue.Api.Features.Dashboard;
using LoadoutQueue.Api.Features.GearItems;
using LoadoutQueue.Api.Features.GearLists;
using LoadoutQueue.Api.Tests.Infrastructure;

namespace LoadoutQueue.Api.Tests.Features.Dashboard;

[Collection(PostgreSqlCollection.Name)]
public sealed class DashboardEndpointsTests(
    PostgreSqlFixture postgres) : IDisposable
{
    private readonly ApiFactory factory = new(postgres.ConnectionString);

    [Fact]
    public async Task DashboardEndpointsRequireAuthentication()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/dashboard/summary");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SummaryAndPurchaseHistoryReflectActiveOwnedItems()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateListAsync(client, "Primary kit");

        var pending = await CreateItemAsync(
            client,
            list.Id,
            "Optic",
            PurchasePriority.BuyNow,
            PurchaseStatus.ReadyToBuy,
            100m,
            null);
        await CreateItemAsync(
            client,
            list.Id,
            "Sling",
            PurchasePriority.BuyNext,
            PurchaseStatus.Purchased,
            80m,
            75m);
        await CreateItemAsync(
            client,
            list.Id,
            "Cancelled pouch",
            PurchasePriority.Later,
            PurchaseStatus.Cancelled,
            50m,
            null);

        var summary = await client.GetFromJsonAsync<DashboardSummaryResponse>(
            "/api/dashboard/summary");
        var listSummary =
            await client.GetFromJsonAsync<GearListSummaryResponse>(
                $"/api/gear-lists/{list.Id}/summary");
        var purchases =
            await client.GetFromJsonAsync<List<PurchasedItemResponse>>(
                "/api/dashboard/purchases");
        var lists = await client.GetFromJsonAsync<List<GearListListResponse>>(
            "/api/gear-lists");

        summary.Should().NotBeNull();
        summary!.ListCount.Should().Be(1);
        summary.PendingItemCount.Should().Be(1);
        summary.PurchasedItemCount.Should().Be(1);
        summary.TotalEstimated.Should().Be(180m);
        summary.NextPurchase!.Id.Should().Be(pending.Id);
        summary.RecentLists.Should().ContainSingle()
            .Which.ItemCount.Should().Be(3);

        listSummary.Should().NotBeNull();
        listSummary!.ItemCount.Should().Be(3);
        listSummary.PendingItemCount.Should().Be(1);
        listSummary.PurchasedItemCount.Should().Be(1);
        listSummary.BuyNowEstimated.Should().Be(100m);
        listSummary.ActualSpent.Should().Be(75m);
        listSummary.Difference.Should().Be(-5m);

        purchases.Should().ContainSingle();
        purchases![0].Name.Should().Be("Sling");
        purchases[0].Difference.Should().Be(-5m);

        lists.Should().ContainSingle();
        lists![0].ItemCount.Should().Be(3);
        lists[0].PurchasedItemCount.Should().Be(1);
        lists[0].TotalEstimated.Should().Be(180m);
    }

    [Fact]
    public async Task UserCannotReadAnotherUsersListSummary()
    {
        using var owner = await CreateAuthenticatedClientAsync();
        using var other = await CreateAuthenticatedClientAsync();
        var list = await CreateListAsync(owner, "Private kit");

        var response = await other.GetAsync(
            $"/api/gear-lists/{list.Id}/summary");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    public void Dispose()
    {
        factory.Dispose();
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest(
                "Dashboard User",
                $"dashboard-{Guid.NewGuid():N}@example.com",
                "ValidPass123",
                "ValidPass123"));
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return client;
    }

    private static async Task<GearListDetailResponse> CreateListAsync(
        HttpClient client,
        string name)
    {
        var response = await client.PostAsJsonAsync(
            "/api/gear-lists",
            new CreateGearListRequest(name, "Dashboard integration test"));
        response.EnsureSuccessStatusCode();
        return (await response.Content
            .ReadFromJsonAsync<GearListDetailResponse>())!;
    }

    private static async Task<GearItemDetailResponse> CreateItemAsync(
        HttpClient client,
        Guid listId,
        string name,
        PurchasePriority priority,
        PurchaseStatus status,
        decimal? estimatedPrice,
        decimal? actualPrice)
    {
        var response = await client.PostAsJsonAsync(
            $"/api/gear-lists/{listId}/items",
            new CreateGearItemRequest(
                name,
                null,
                GearCategory.Other,
                priority,
                status,
                estimatedPrice,
                actualPrice,
                "https://example.com/item",
                null,
                "Field Store",
                null));
        response.EnsureSuccessStatusCode();
        return (await response.Content
            .ReadFromJsonAsync<GearItemDetailResponse>())!;
    }
}
