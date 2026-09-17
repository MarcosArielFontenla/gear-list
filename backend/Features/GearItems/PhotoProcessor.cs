using ImageMagick;

namespace LoadoutQueue.Api.Features.GearItems;

public sealed record ProcessedPhoto(byte[] Image, byte[] Thumbnail, int Width, int Height);

public static class PhotoProcessor
{
    public const int MaxFileBytes = 12 * 1024 * 1024;
    // Serialize decoding to bound memory usage even when several uploads arrive together.
    private static readonly SemaphoreSlim Decoder = new(1);

    public static async Task<ProcessedPhoto> ProcessAsync(IFormFile file, CancellationToken token)
    {
        if (file.Length is <= 0 or > MaxFileBytes)
            throw new PhotoValidationException("Cada foto debe pesar como máximo 12 MB.");

        await using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, token);
        var bytes = buffer.ToArray();
        MagickFormat format;
        if (bytes.Length >= 3 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255)
            format = MagickFormat.Jpeg;
        else if (bytes.Length >= 8 && bytes.AsSpan(0, 8).SequenceEqual(new byte[] {137,80,78,71,13,10,26,10}))
            format = MagickFormat.Png;
        else if (bytes.Length >= 12 && System.Text.Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF" &&
                 System.Text.Encoding.ASCII.GetString(bytes, 8, 4) == "WEBP")
            format = MagickFormat.WebP;
        else throw new PhotoValidationException("Usa fotos JPG, PNG o WebP.");

        await Decoder.WaitAsync(token);
        try
        {
            var settings = new MagickReadSettings { Format = format, FrameCount = 1 };
            using var image = new MagickImage();
            image.Ping(bytes, settings);
            if ((long)image.Width * image.Height > 40_000_000 || image.Width == 0 || image.Height == 0)
                throw new PhotoValidationException("La foto supera el límite de 40 megapíxeles.");
            image.Read(bytes, settings);
            image.AutoOrient();
            image.ColorSpace = ColorSpace.sRGB;
            image.Resize(new MagickGeometry(1600, 1600) { Greater = true });
            image.Strip();
            image.Quality = 82;
            var width = (int)image.Width;
            var height = (int)image.Height;
            var optimized = image.ToByteArray(MagickFormat.WebP);
            image.Resize(new MagickGeometry(320, 320) { Greater = true });
            var thumbnail = image.ToByteArray(MagickFormat.WebP);
            return new ProcessedPhoto(optimized, thumbnail, width, height);
        }
        catch (MagickException) { throw new PhotoValidationException("No pudimos leer esa foto. Prueba con otro archivo JPG, PNG o WebP."); }
        finally { Decoder.Release(); }
    }
}

public sealed class PhotoValidationException(string message) : Exception(message);
