using Microsoft.AspNetCore.Identity;

namespace LoadoutQueue.Api.Domain.Entities;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<GearList> GearLists { get; set; } = [];

    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
