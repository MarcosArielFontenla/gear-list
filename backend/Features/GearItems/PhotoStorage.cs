using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using LoadoutQueue.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LoadoutQueue.Api.Features.GearItems;

public interface IPhotoStorage
{
    bool IsConfigured { get; }
    Task PutAsync(string key, byte[] bytes, CancellationToken token);
    Task<string> GetUrlAsync(string key);
    Task DeleteAsync(string key, CancellationToken token);
}

public sealed class S3PhotoStorage(IConfiguration configuration) : IPhotoStorage, IDisposable
{
    private readonly string? bucket = configuration["Photos:Bucket"];
    private AmazonS3Client? client;
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(bucket) &&
        Uri.TryCreate(configuration["Photos:Endpoint"], UriKind.Absolute, out var endpoint) &&
        endpoint.Scheme == "https" &&
        !string.IsNullOrWhiteSpace(configuration["Photos:AccessKey"]) &&
        !string.IsNullOrWhiteSpace(configuration["Photos:SecretKey"]);

    private AmazonS3Client Client => client ??= new AmazonS3Client(
        new BasicAWSCredentials(configuration["Photos:AccessKey"], configuration["Photos:SecretKey"]),
        new AmazonS3Config {
            ServiceURL = configuration["Photos:Endpoint"],
            AuthenticationRegion = configuration["Photos:Region"] ?? "auto",
            ForcePathStyle = false
        });

    public async Task PutAsync(string key, byte[] bytes, CancellationToken token)
    {
        using var stream = new MemoryStream(bytes);
        await Client.PutObjectAsync(new PutObjectRequest {
            BucketName = bucket, Key = key, InputStream = stream,
            ContentType = "image/webp",
            UseChunkEncoding = false,
            DisablePayloadSigning = true,
            DisableDefaultChecksumValidation = true
        }, token);
    }

    public Task<string> GetUrlAsync(string key) => Client.GetPreSignedURLAsync(new GetPreSignedUrlRequest {
        BucketName = bucket, Key = key, Verb = HttpVerb.GET,
        Expires = DateTime.UtcNow.AddHours(1)
    });

    public async Task DeleteAsync(string key, CancellationToken token) =>
        await Client.DeleteObjectAsync(bucket, key, token);

    public void Dispose() => client?.Dispose();
}

public sealed class PhotoCleanupWorker(IServiceScopeFactory scopes, ILogger<PhotoCleanupWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var storage = scope.ServiceProvider.GetRequiredService<IPhotoStorage>();
                if (!storage.IsConfigured) continue;
                var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var pending = await database.PhotoDeletions.Where(p => p.NotBefore <= DateTimeOffset.UtcNow &&
                    !database.GearItemPhotos.Any(photo => photo.ObjectKey == p.ObjectKey || photo.ThumbnailKey == p.ObjectKey)).Take(100).ToListAsync(stoppingToken);
                foreach (var entry in pending)
                {
                    await storage.DeleteAsync(entry.ObjectKey, stoppingToken);
                    database.PhotoDeletions.Remove(entry);
                }
                await database.SaveChangesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception error) { logger.LogWarning(error, "Photo cleanup will retry."); }
        }
    }
}
