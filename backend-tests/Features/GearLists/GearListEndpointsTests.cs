using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using LoadoutQueue.Api.Features.Authentication;
using LoadoutQueue.Api.Features.GearLists;
using LoadoutQueue.Api.Persistence;
using LoadoutQueue.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LoadoutQueue.Api.Tests.Features.GearLists;

[Collection(PostgreSqlCollection.Name)]
public sealed class GearListEndpointsTests(
    PostgreSqlFixture postgres) : IDisposable
{
    private readonly ApiFactory factory = new(postgres.ConnectionString);

    [Fact]
    public async Task GearListEndpointsRequireAuthentication()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/gear-lists");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task OwnerCanCreateAndReadGearLists()
    {
        using var client = await CreateAuthenticatedClientAsync();

        var createResponse = await client.PostAsJsonAsync(
            "/api/gear-lists",
            new CreateGearListRequest(
                "  Primary loadout  ",
                "  Weekend setup  "));

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content
            .ReadFromJsonAsync<GearListDetailResponse>();
        created.Should().NotBeNull();
        created!.Name.Should().Be("Primary loadout");
        created.Description.Should().Be("Weekend setup");
        createResponse.Headers.Location.Should().NotBeNull();
        createResponse.Headers.Location!.ToString()
            .Should().EndWith($"/api/gear-lists/{created.Id}");

        var getResponse = await client.GetAsync(
            $"/api/gear-lists/{created.Id}");
        var detail = await getResponse.Content
            .ReadFromJsonAsync<GearListDetailResponse>();
        var listResponse = await client.GetAsync("/api/gear-lists");
        var lists = await listResponse.Content
            .ReadFromJsonAsync<List<GearListListResponse>>();

        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        detail.Should().Be(created);
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        lists.Should().ContainSingle(list => list.Id == created.Id);
    }

    [Fact]
    public async Task OwnerCanUpdateAndArchiveGearList()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var created = await CreateGearListAsync(client);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/gear-lists/{created.Id}",
            new UpdateGearListRequest(
                "  Updated loadout  ",
                "  Updated notes  "));
        var updated = await updateResponse.Content
            .ReadFromJsonAsync<GearListDetailResponse>();

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        updated!.Name.Should().Be("Updated loadout");
        updated.Description.Should().Be("Updated notes");
        updated.UpdatedAt.Should().BeOnOrAfter(created.UpdatedAt);

        var deleteResponse = await client.DeleteAsync(
            $"/api/gear-lists/{created.Id}");
        var getResponse = await client.GetAsync(
            $"/api/gear-lists/{created.Id}");
        var listResponse = await client.GetAsync("/api/gear-lists");
        var lists = await listResponse.Content
            .ReadFromJsonAsync<List<GearListListResponse>>();

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        lists.Should().NotContain(list => list.Id == created.Id);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var stored = await database.GearLists
            .AsNoTracking()
            .SingleAsync(list => list.Id == created.Id);

        stored.IsArchived.Should().BeTrue();
    }

    [Fact]
    public async Task UserCannotReadModifyOrDeleteAnotherUsersList()
    {
        using var ownerClient = await CreateAuthenticatedClientAsync();
        using var otherClient = await CreateAuthenticatedClientAsync();
        var created = await CreateGearListAsync(ownerClient);

        var getResponse = await otherClient.GetAsync(
            $"/api/gear-lists/{created.Id}");
        var updateResponse = await otherClient.PutAsJsonAsync(
            $"/api/gear-lists/{created.Id}",
            new UpdateGearListRequest("Stolen list", null));
        var deleteResponse = await otherClient.DeleteAsync(
            $"/api/gear-lists/{created.Id}");

        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        updateResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var ownerResponse = await ownerClient.GetAsync(
            $"/api/gear-lists/{created.Id}");
        var ownerList = await ownerResponse.Content
            .ReadFromJsonAsync<GearListDetailResponse>();

        ownerResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        ownerList!.Name.Should().Be(created.Name);
    }

    [Fact]
    public async Task InvalidCreateAndUpdateReturnValidationProblems()
    {
        using var client = await CreateAuthenticatedClientAsync();
        var createResponse = await client.PostAsJsonAsync(
            "/api/gear-lists",
            new CreateGearListRequest(
                " ",
                new string('x', 1_001)));

        createResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        createResponse.Content.Headers.ContentType!.MediaType
            .Should().Be("application/problem+json");

        var created = await CreateGearListAsync(client);
        var updateResponse = await client.PutAsJsonAsync(
            $"/api/gear-lists/{created.Id}",
            new UpdateGearListRequest(new string('x', 121), null));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        updateResponse.Content.Headers.ContentType!.MediaType
            .Should().Be("application/problem+json");
    }

    public void Dispose()
    {
        factory.Dispose();
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var registration = new RegisterRequest(
            "Gear List User",
            $"gear-lists-{Guid.NewGuid():N}@example.com",
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
            new CreateGearListRequest("Test loadout", "Integration test"));

        response.EnsureSuccessStatusCode();
        return (await response.Content
            .ReadFromJsonAsync<GearListDetailResponse>())!;
    }
}
