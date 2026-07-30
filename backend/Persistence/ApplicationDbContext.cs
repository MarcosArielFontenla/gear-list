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

    public DbSet<GearItem> GearItems => Set<GearItem>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.ApplyConfiguration(new ApplicationUserConfiguration());
        builder.ApplyConfiguration(new GearListConfiguration());
        builder.ApplyConfiguration(new GearItemConfiguration());
        builder.ApplyConfiguration(new RefreshTokenConfiguration());
    }
}
