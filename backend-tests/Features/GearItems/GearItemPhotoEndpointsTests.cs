using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using ImageMagick;
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
public sealed class GearItemPhotoEndpointsTests(PostgreSqlFixture postgres) : IDisposable
{
    private readonly ApiFactory factory = new(postgres.ConnectionString);
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static CreateGearItemRequest Input(string name = "Photo product") => new(
        name, "Descripción", GearCategory.Other, PurchasePriority.BuyNow, PurchaseStatus.Planned,
        100, null, null, null, "Tienda", "Notas");

    private static MultipartFormDataContent Multipart(object input, string[] order, int files = 0)
    {
        var body = new MultipartFormDataContent();
        body.Add(new StringContent(JsonSerializer.Serialize(input, Json)), "input");
        body.Add(new StringContent(JsonSerializer.Serialize(order)), "photoOrder");
        for (var i = 0; i < files; i++)
        {
            using var image = new MagickImage(i == 0 ? MagickColors.Orange : MagickColors.Blue, 100, 80);
            var content = new ByteArrayContent(image.ToByteArray(MagickFormat.Png));
            content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            body.Add(content, "photos", $"photo-{i}.png");
        }
        return body;
    }

    private async Task<HttpClient> ClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Photo User", $"photos-{Guid.NewGuid():N}@example.com", "ValidPass123", "ValidPass123"));
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return client;
    }
    private static async Task<Guid> ListAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/gear-lists", new CreateGearListRequest("Gallery", null));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<GearListDetailResponse>())!.Id;
    }

    [Fact]
    public async Task UploadsReordersRemovesAndProtectsPrivatePhotos()
    {
        using var owner = await ClientAsync();
        using var other = await ClientAsync();
        var list = await ListAsync(owner);
        using var body = Multipart(Input(), ["new-1", "new-0"], 2);
        var response = await owner.PostAsync($"/api/gear-lists/{list}/items/with-photos", body);
        response.EnsureSuccessStatusCode();
        var item = (await response.Content.ReadFromJsonAsync<GearItemDetailResponse>())!;
        item.PhotoCount.Should().Be(2);
        factory.Photos.Objects.Should().HaveCount(4);
        var path = $"/api/gear-lists/{list}/items/{item.Id}";
        var photos = (await owner.GetFromJsonAsync<GearItemPhotoResponse[]>(path + "/photos"))!;
        photos.Should().HaveCount(2);
        (await other.GetAsync(path + "/photos")).StatusCode.Should().Be(HttpStatusCode.NotFound);

        var edit = new UpdateGearItemRequest(item.Name, item.Description, item.Category, item.Priority, item.Status,
            item.EstimatedPrice, item.ActualPrice, item.ProductUrl, item.ImageUrl, item.StoreName, item.Notes, item.Version);
        using var replacement = Multipart(edit, [photos[1].Id.ToString()]);
        var updated = await owner.PutAsync(path + "/with-photos", replacement);
        updated.EnsureSuccessStatusCode();
        var next = (await updated.Content.ReadFromJsonAsync<GearItemDetailResponse>())!;
        next.Version.Should().NotBe(item.Version);
        next.PhotoCount.Should().Be(1);
        var gallery = (await owner.GetFromJsonAsync<GearItemPhotoResponse[]>(path + "/photos"))!;
        gallery.Single().Id.Should().Be(photos[1].Id);
        using var stale = Multipart(edit, []);
        (await owner.PutAsync(path + "/with-photos", stale)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.PhotoDeletions.CountAsync(p => p.ObjectKey.Contains(photos[0].Id.ToString()))).Should().Be(2);
        (await owner.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await db.GearItemPhotos.AnyAsync(p => p.GearItemId == item.Id)).Should().BeFalse();
        (await db.PhotoDeletions.CountAsync(p => p.ObjectKey.Contains(photos[1].Id.ToString()))).Should().Be(2);
    }

    [Fact]
    public async Task RejectsInvalidCountsAndForeignPhotoIdsWithoutCreatingProducts()
    {
        using var client = await ClientAsync();
        var list = await ListAsync(client);
        using var invalid = Multipart(Input(), Enumerable.Range(0, 7).Select(i => "new-" + i).ToArray(), 7);
        (await client.PostAsync($"/api/gear-lists/{list}/items/with-photos", invalid)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var foreign = Multipart(Input(), [Guid.NewGuid().ToString()]);
        (await client.PostAsync($"/api/gear-lists/{list}/items/with-photos", foreign)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetFromJsonAsync<GearItemListResponse[]>($"/api/gear-lists/{list}/items")).Should().BeEmpty();
    }

    [Fact]
    public async Task StorageFailureDoesNotCreateHalfSavedProducts()
    {
        using var client = await ClientAsync();
        var list = await ListAsync(client);
        factory.Photos.FailUpload = true;
        using var body = Multipart(Input(), ["new-0"], 1);
        (await client.PostAsync($"/api/gear-lists/{list}/items/with-photos", body)).StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        (await client.GetFromJsonAsync<GearItemListResponse[]>($"/api/gear-lists/{list}/items")).Should().BeEmpty();
    }

    [Fact]
    public async Task PreservesLegacyImageAsASelectableGalleryPhoto()
    {
        using var client = await ClientAsync();
        var list = await ListAsync(client);
        using var body = Multipart(Input() with { ImageUrl = "https://example.com/old.jpg" }, ["legacy"]);
        var response = await client.PostAsync($"/api/gear-lists/{list}/items/with-photos", body);
        response.EnsureSuccessStatusCode();
        var item = (await response.Content.ReadFromJsonAsync<GearItemDetailResponse>())!;
        item.ImageUrl.Should().BeNull();
        var photos = (await client.GetFromJsonAsync<GearItemPhotoResponse[]>($"/api/gear-lists/{list}/items/{item.Id}/photos"))!;
        photos.Single().Url.Should().Be("https://example.com/old.jpg");
        factory.Photos.Objects.Should().BeEmpty();
    }

    public void Dispose() => factory.Dispose();
}
