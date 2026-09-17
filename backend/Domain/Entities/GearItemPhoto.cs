namespace LoadoutQueue.Api.Domain.Entities;

public sealed class GearItemPhoto
{
    public Guid Id { get; set; }
    public Guid GearItemId { get; set; }
    public GearItem GearItem { get; set; } = null!;
    public string ObjectKey { get; set; } = "";
    public string ThumbnailKey { get; set; } = "";
    public string? ExternalUrl { get; set; }
    public int Position { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
}

// Durable deletion queue: a temporary storage outage must not leave removed photos forever.
public sealed class PhotoDeletion
{
    public DateTimeOffset NotBefore { get; set; } = DateTimeOffset.UtcNow;
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ObjectKey { get; set; } = "";
}
