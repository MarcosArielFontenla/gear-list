using LoadoutQueue.Api.Domain.Entities;
using LoadoutQueue.Api.Persistence.Configurations;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace LoadoutQueue.Api.Persistence;

public sealed class ApplicationDbContext(
    DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options),
        IDataProtectionKeyContext
{
    public DbSet<DataProtectionKey> DataProtectionKeys =>
        Set<DataProtectionKey>();

    public DbSet<GearList> GearLists => Set<GearList>();

    public DbSet<GearItemPhoto> GearItemPhotos => Set<GearItemPhoto>();
    public DbSet<PhotoDeletion> PhotoDeletions => Set<PhotoDeletion>();

    public DbSet<GearItem> GearItems => Set<GearItem>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<GearItemPhoto>(photo =>
        {
            photo.HasKey(p => p.Id);
            photo.Property(p => p.ExternalUrl).HasMaxLength(2048);
            photo.Property(p => p.ObjectKey).HasMaxLength(300);
            photo.Property(p => p.ThumbnailKey).HasMaxLength(300);
            photo.HasIndex(p => new { p.GearItemId, p.Position });
            photo.HasOne(p => p.GearItem).WithMany(i => i.Photos)
                .HasForeignKey(p => p.GearItemId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<PhotoDeletion>().Property(p => p.ObjectKey).HasMaxLength(300);

        builder.ApplyConfiguration(new ApplicationUserConfiguration());
        builder.ApplyConfiguration(new GearListConfiguration());
        builder.ApplyConfiguration(new GearItemConfiguration());
        builder.ApplyConfiguration(new RefreshTokenConfiguration());
    }
}
