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
public sealed class GearItemEndpointsTests(
    PostgreSqlFixture postgres) : IDisposable
{
    private readonly ApiFactory factory = new(postgres.ConnectionString);

    [Fact]
    public async Task GearItemEndpointsRequireAuthentication()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync(
            $"/api/gear-lists/{Guid.NewGuid()}/items");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task OwnerCanCreateAndReadItemsWithPositionsPerPriority()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(client);

        var first = await CreateGearItemAsync(
            client,
            list.Id,
            CreateItemRequest("Eye protection", PurchasePriority.BuyNow));
        var second = await CreateGearItemAsync(
            client,
            list.Id,
            CreateItemRequest("Plate carrier", PurchasePriority.BuyNow));
        var third = await CreateGearItemAsync(
            client,
            list.Id,
            CreateItemRequest("Radio", PurchasePriority.BuyNext));

        first.Position.Should().Be(0);
        second.Position.Should().Be(1);
        third.Position.Should().Be(0);
        first.Version.Should().NotBeEmpty();

        var getResponse = await client.GetAsync(
            $"/api/gear-lists/{list.Id}/items/{second.Id}");
        var detail = await getResponse.Content
            .ReadFromJsonAsync<GearItemDetailResponse>();
        var listResponse = await client.GetAsync(
            $"/api/gear-lists/{list.Id}/items");
        var items = await listResponse.Content
            .ReadFromJsonAsync<List<GearItemListResponse>>();

        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        detail.Should().Be(second);
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        items!.Select(item => item.Id)
            .Should()
            .ContainInOrder(first.Id, second.Id, third.Id);
    }

    [Fact]
    public async Task UpdateChangesFieldsAndAppendsToNewPriority()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(client);
        await CreateGearItemAsync(
            client,
            list.Id,
            CreateItemRequest("Existing item", PurchasePriority.BuyNext));
        var moving = await CreateGearItemAsync(
            client,
            list.Id,
            CreateItemRequest("Moving item", PurchasePriority.BuyNow));

        var response = await client.PutAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/{moving.Id}",
            new UpdateGearItemRequest(
                "  Updated optic  ",
                "  Low profile sight  ",
                GearCategory.Optics,
                PurchasePriority.BuyNext,
                PurchaseStatus.Researching,
                145.50m,
                null,
                "  https://example.com/optic  ",
                null,
                "  Field Store  ",
                "  Compare mounts  ",
                moving.Version));
        var updated = await response.Content
            .ReadFromJsonAsync<GearItemDetailResponse>();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        updated!.Name.Should().Be("Updated optic");
        updated.Description.Should().Be("Low profile sight");
        updated.ProductUrl.Should().Be("https://example.com/optic");
        updated.StoreName.Should().Be("Field Store");
        updated.Notes.Should().Be("Compare mounts");
        updated.Priority.Should().Be(PurchasePriority.BuyNext);
        updated.Position.Should().Be(1);
        updated.Version.Should().NotBe(moving.Version);
        updated.UpdatedAt.Should().BeOnOrAfter(moving.UpdatedAt);
    }

    [Fact]
    public async Task StatusPatchTracksPurchaseAndRotatesVersion()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(client);
        var item = await CreateGearItemAsync(
            client,
            list.Id,
            CreateItemRequest("Tracer unit", PurchasePriority.BuyNow));

        var purchaseResponse = await client.PatchAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/{item.Id}/status",
            new UpdateGearItemStatusRequest(
                PurchaseStatus.Purchased,
                89.90m,
                item.Version));
        var purchased = await purchaseResponse.Content
            .ReadFromJsonAsync<GearItemDetailResponse>();

        purchaseResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        purchased!.Status.Should().Be(PurchaseStatus.Purchased);
        purchased.ActualPrice.Should().Be(89.90m);
        purchased.PurchasedAt.Should().NotBeNull();
        purchased.Version.Should().NotBe(item.Version);

        var reopenResponse = await client.PatchAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/{item.Id}/status",
            new UpdateGearItemStatusRequest(
                PurchaseStatus.Researching,
                null,
                purchased.Version));
        var reopened = await reopenResponse.Content
            .ReadFromJsonAsync<GearItemDetailResponse>();

        reopenResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        reopened!.Status.Should().Be(PurchaseStatus.Researching);
        reopened.PurchasedAt.Should().BeNull();
        reopened.ActualPrice.Should().BeNull();
        reopened.Version.Should().NotBe(purchased.Version);
    }

    [Fact]
    public async Task StaleVersionReturnsConflictWithCurrentItem()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(client);
        var original = await CreateGearItemAsync(
            client,
            list.Id,
            CreateItemRequest("Original item", PurchasePriority.Later));

        var firstUpdate = await client.PutAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/{original.Id}",
            CreateUpdateRequest(original, "Current name"));
        var current = await firstUpdate.Content
            .ReadFromJsonAsync<GearItemDetailResponse>();

        var staleUpdate = await client.PutAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/{original.Id}",
            CreateUpdateRequest(original, "Stale name"));
        var conflict = await staleUpdate.Content
            .ReadFromJsonAsync<GearItemConflictResponse>();

        firstUpdate.StatusCode.Should().Be(HttpStatusCode.OK);
        staleUpdate.StatusCode.Should().Be(HttpStatusCode.Conflict);
        conflict!.Current.Id.Should().Be(original.Id);
        conflict.Current.Name.Should().Be("Current name");
        conflict.Current.Version.Should().Be(current!.Version);
        conflict.Current.Version.Should().NotBe(original.Version);
    }

    [Fact]
    public async Task DeleteRemovesOwnedItem()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(client);
        var item = await CreateGearItemAsync(
            client,
            list.Id,
            CreateItemRequest("Disposable item", PurchasePriority.Someday));

        var deleteResponse = await client.DeleteAsync(
            $"/api/gear-lists/{list.Id}/items/{item.Id}");
        var getResponse = await client.GetAsync(
            $"/api/gear-lists/{list.Id}/items/{item.Id}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var exists = await database.GearItems
            .AnyAsync(candidate => candidate.Id == item.Id);

        exists.Should().BeFalse();
    }

    [Fact]
    public async Task UserCannotAccessItemsInAnotherUsersList()
    {
        using var ownerClient = await CreateAuthenticatedClientAsync();
        using var otherClient = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(ownerClient);
        var item = await CreateGearItemAsync(
            ownerClient,
            list.Id,
            CreateItemRequest("Private item", PurchasePriority.BuyNow));

        var collectionResponse = await otherClient.GetAsync(
            $"/api/gear-lists/{list.Id}/items");
        var getResponse = await otherClient.GetAsync(
            $"/api/gear-lists/{list.Id}/items/{item.Id}");
        var createResponse = await otherClient.PostAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items",
            CreateItemRequest("Injected item", PurchasePriority.BuyNow));
        var updateResponse = await otherClient.PutAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/{item.Id}",
            CreateUpdateRequest(item, "Stolen item"));
        var statusResponse = await otherClient.PatchAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items/{item.Id}/status",
            new UpdateGearItemStatusRequest(
                PurchaseStatus.Purchased,
                1m,
                item.Version));
        var deleteResponse = await otherClient.DeleteAsync(
            $"/api/gear-lists/{list.Id}/items/{item.Id}");

        collectionResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        createResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        updateResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        statusResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var ownerResponse = await ownerClient.GetAsync(
            $"/api/gear-lists/{list.Id}/items/{item.Id}");
        var ownerItem = await ownerResponse.Content
            .ReadFromJsonAsync<GearItemDetailResponse>();

        ownerResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        ownerItem!.Name.Should().Be(item.Name);
    }

    [Fact]
    public async Task InvalidPricesEnumsAndUrlsReturnValidationProblem()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var list = await CreateGearListAsync(client);
        var request = new CreateGearItemRequest(
            "Invalid item",
            null,
            (GearCategory)999,
            (PurchasePriority)999,
            (PurchaseStatus)999,
            -1m,
            -2m,
            "not-a-url",
            "ftp://example.com/image.png",
            null,
            null);

        var response = await client.PostAsJsonAsync(
            $"/api/gear-lists/{list.Id}/items",
            request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType!.MediaType
            .Should().Be("application/problem+json");

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var itemCount = await database.GearItems
            .CountAsync(item => item.GearListId == list.Id);

        itemCount.Should().Be(0);
    }

    public void Dispose()
    {
        factory.Dispose();
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var registration = new RegisterRequest(
            "Gear Item User",
            $"gear-items-{Guid.NewGuid():N}@example.com",
            "ValidPass123",
            "ValidPass123");
        var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            registration);

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
                $"Item test list {Guid.NewGuid():N}",
                null));

        response.EnsureSuccessStatusCode();
        return (await response.Content
            .ReadFromJsonAsync<GearListDetailResponse>())!;
    }

    private static async Task<GearItemDetailResponse> CreateGearItemAsync(
        HttpClient client,
        Guid listId,
        CreateGearItemRequest request)
    {
        var response = await client.PostAsJsonAsync(
            $"/api/gear-lists/{listId}/items",
            request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content
            .ReadFromJsonAsync<GearItemDetailResponse>())!;
    }

    private static CreateGearItemRequest CreateItemRequest(
        string name,
        PurchasePriority priority)
    {
        return new CreateGearItemRequest(
            name,
            "Integration test item",
            GearCategory.Other,
            priority,
            PurchaseStatus.Planned,
            100m,
            null,
            "https://example.com/product",
            "https://example.com/image.png",
            "Test Store",
            "Test notes");
    }

    private static UpdateGearItemRequest CreateUpdateRequest(
        GearItemDetailResponse item,
        string name)
    {
        return new UpdateGearItemRequest(
            name,
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
            item.Version);
    }
}
