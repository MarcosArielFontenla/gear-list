using System.Collections.Concurrent;
using Amazon.S3;
using LoadoutQueue.Api.Features.GearItems;

namespace LoadoutQueue.Api.Tests.Infrastructure;
public sealed class RecordingPhotoStorage : IPhotoStorage
{
    public bool IsConfigured => true;
    public bool FailUpload { get; set; }
    public ConcurrentDictionary<string, byte[]> Objects { get; } = new();
    public Task PutAsync(string key, byte[] bytes, CancellationToken token)
    {
        if (FailUpload) throw new AmazonS3Exception("Simulated storage failure");
        Objects[key] = bytes;
        return Task.CompletedTask;
    }
    public Task<string> GetUrlAsync(string key) => Task.FromResult("https://photos.example.com/" + key);
    public Task DeleteAsync(string key, CancellationToken token)
    {
        Objects.TryRemove(key, out _);
        return Task.CompletedTask;
    }
}
