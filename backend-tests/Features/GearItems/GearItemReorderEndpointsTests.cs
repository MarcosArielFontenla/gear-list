using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using LoadoutQueue.Api.Domain.Enums;
using LoadoutQueue.Api.Features.Authentication;
using LoadoutQueue.Api.Features.GearItems;
using LoadoutQueue.Api.Features.GearLists;
using LoadoutQueue.Api.Persistence;
using LoadoutQueue.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LoadoutQueue.Api.Tests.Features.GearItems;

[Collection(PostgreSqlCollection.Name)]
public sealed class GearItemReorderEndpointsTests(
    PostgreSqlFixture postgres) : IDisposable
{
    private readonly ApiFactory factory = new(postgres.ConnectionString);

    [Fact]
    public async Task ReorderMovesItemsAcrossPrioritiesAndRotatesVersions()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(client);
        var first = await CreateGearItemAsync(
            client,
            list.Id,
            "First",
            PurchasePriority.BuyNow);
        var second = await CreateGearItemAsync(
            client,
            list.Id,
            "Second",
            PurchasePriority.BuyNow);
        var third = await CreateGearItemAsync(
            client,
            list.Id,
            "Third",
            PurchasePriority.Later);
        var request = new ReorderGearItemsRequest(
            [
                new(
                    second.Id,
                    PurchasePriority.BuyNow,
                    0,
                    second.Version),
                new(
                    third.Id,
                    PurchasePriority.BuyNow,
                    1,
                    third.Version),
                new(
                    first.Id,
                    PurchasePriority.Later,
                    0,
                    first.Version)
            ]);

        var response = await client.PutAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/reorder",
            request);
        var reordered = await response.Content
            .ReadFromJsonAsync<ReorderGearItemsResponse>();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        reordered!.Items.Select(item => item.Id)
            .Should()
            .ContainInOrder(second.Id, third.Id, first.Id);
        reordered.Items.Should().OnlyContain(
            item => item.Version != request.Items
                .Single(original => original.ItemId == item.Id)
                .Version);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var stored = await database.GearItems
            .AsNoTracking()
            .Where(item => item.GearListId == list.Id)
            .OrderBy(item => item.Priority)
            .ThenBy(item => item.Position)
            .ToListAsync();

        stored.Select(item => item.Id)
            .Should()
            .ContainInOrder(second.Id, third.Id, first.Id);
    }

    [Fact]
    public async Task StaleReorderReturnsCurrentOrderWithoutPartialUpdates()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(client);
        var first = await CreateGearItemAsync(
            client,
            list.Id,
            "First",
            PurchasePriority.BuyNow);
        var second = await CreateGearItemAsync(
            client,
            list.Id,
            "Second",
            PurchasePriority.BuyNow);

        var statusResponse = await client.PatchAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/{first.Id}/status",
            new UpdateGearItemStatusRequest(
                PurchaseStatus.Researching,
                null,
                first.Version));
        var currentFirst = await statusResponse.Content
            .ReadFromJsonAsync<GearItemDetailResponse>();
        var request = new ReorderGearItemsRequest(
            [
                new(
                    second.Id,
                    PurchasePriority.BuyNow,
                    0,
                    second.Version),
                new(
                    first.Id,
                    PurchasePriority.BuyNow,
                    1,
                    first.Version)
            ]);

        var response = await client.PutAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/reorder",
            request);
        var conflict = await response.Content
            .ReadFromJsonAsync<ReorderGearItemsConflictResponse>();

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        conflict!.Current
            .Single(item => item.Id == first.Id)
            .Version
            .Should()
            .Be(currentFirst!.Version);
        conflict.Current
            .Single(item => item.Id == second.Id)
            .Position
            .Should()
            .Be(1);
        conflict.Current
            .Single(item => item.Id == second.Id)
            .Version
            .Should()
            .Be(second.Version);
    }

    [Fact]
    public async Task ReorderRequiresCompleteCurrentSnapshot()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(client);
        var first = await CreateGearItemAsync(
            client,
            list.Id,
            "First",
            PurchasePriority.BuyNow);
        var second = await CreateGearItemAsync(
            client,
            list.Id,
            "Second",
            PurchasePriority.BuyNext);
        var request = new ReorderGearItemsRequest(
            [
                new(
                    first.Id,
                    PurchasePriority.BuyNow,
                    0,
                    first.Version)
            ]);

        var response = await client.PutAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/reorder",
            request);
        var conflict = await response.Content
            .ReadFromJsonAsync<ReorderGearItemsConflictResponse>();

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        conflict!.Current.Select(item => item.Id)
            .Should()
            .BeEquivalentTo([first.Id, second.Id]);
    }

    [Fact]
    public async Task DuplicateOrNonContiguousPositionsAreRejected()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(client);
        var first = await CreateGearItemAsync(
            client,
            list.Id,
            "First",
            PurchasePriority.BuyNow);
        var second = await CreateGearItemAsync(
            client,
            list.Id,
            "Second",
            PurchasePriority.BuyNow);
        var request = new ReorderGearItemsRequest(
            [
                new(
                    first.Id,
                    PurchasePriority.BuyNow,
                    0,
                    first.Version),
                new(
                    second.Id,
                    PurchasePriority.BuyNow,
                    0,
                    second.Version)
            ]);

        var response = await client.PutAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/reorder",
            request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType!.MediaType
            .Should().Be("application/problem+json");
    }

    [Fact]
    public async Task UserCannotReorderAnotherUsersItems()
    {
        using var ownerClient = await CreateAuthenticatedClientAsync();
        using var otherClient = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(ownerClient);
        var item = await CreateGearItemAsync(
            ownerClient,
            list.Id,
            "Private",
            PurchasePriority.BuyNow);
        var request = new ReorderGearItemsRequest(
            [
                new(
                    item.Id,
                    PurchasePriority.Later,
                    0,
                    item.Version)
            ]);

        var response = await otherClient.PutAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/reorder",
            request);

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
                "Reorder User",
                $"reorder-{Guid.NewGuid():N}@example.com",
                "ValidPass123",
                "ValidPass123"));

        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        return client;
    }

    private static async Task<GearListDetailResponse> CreateGearListAsync(
        HttpClient client)
    {
        var response = await client.PostAsJsonAsync(
            "/api/gear-lists",
            new CreateGearListRequest(
                $"Reorder list {Guid.NewGuid():N}",
                null));

        response.EnsureSuccessStatusCode();
        return (await response.Content
            .ReadFromJsonAsync<GearListDetailResponse>())!;
    }

    private static async Task<GearItemDetailResponse> CreateGearItemAsync(
        HttpClient client,
        Guid listId,
        string name,
        PurchasePriority priority)
    {
        var response = await client.PostAsJsonAsync(
            $"/api/gear-lists/{listId}/items",
            new CreateGearItemRequest(
                name,
                null,
                GearCategory.Other,
                priority,
                PurchaseStatus.Planned,
                10m,
                null,
                null,
                null,
                null,
                null));

        response.EnsureSuccessStatusCode();
        return (await response.Content
            .ReadFromJsonAsync<GearItemDetailResponse>())!;
    }
}
