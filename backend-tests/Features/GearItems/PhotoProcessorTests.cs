using FluentAssertions;
using ImageMagick;
using LoadoutQueue.Api.Features.GearItems;
using Microsoft.AspNetCore.Http;

namespace LoadoutQueue.Api.Tests.Features.GearItems;
public sealed class PhotoProcessorTests
{
    [Fact]
    public async Task ResizesToWebpAndPreservesAspectRatio()
    {
        using var source = new MagickImage(MagickColors.Orange, 2400, 1200);
        using var stream = new MemoryStream(source.ToByteArray(MagickFormat.Png));
        var file = new FormFile(stream, 0, stream.Length, "photos", "photo.png");
        var result = await PhotoProcessor.ProcessAsync(file, CancellationToken.None);
        result.Width.Should().Be(1600);
        result.Height.Should().Be(800);
        using var image = new MagickImage(result.Image);
        image.Format.Should().Be(MagickFormat.WebP);
        using var thumbnail = new MagickImage(result.Thumbnail);
        thumbnail.Width.Should().Be(320);
        thumbnail.Height.Should().Be(160);
    }

    [Fact]
    public async Task RejectsExecutableContentEvenWithAnImageFilename()
    {
        using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("<svg><script>alert(1)</script></svg>"));
        var file = new FormFile(stream, 0, stream.Length, "photos", "photo.png");
        var act = () => PhotoProcessor.ProcessAsync(file, CancellationToken.None);
        await act.Should().ThrowAsync<PhotoValidationException>();
    }

    [Fact]
    public async Task RejectsOversizedFilesBeforeReadingThem()
    {
        var file = new FormFile(Stream.Null, 0, PhotoProcessor.MaxFileBytes + 1, "photos", "photo.jpg");
        var act = () => PhotoProcessor.ProcessAsync(file, CancellationToken.None);
        await act.Should().ThrowAsync<PhotoValidationException>();
    }
}
