using LoadoutQueue.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadoutQueue.Api.Persistence.Configurations;

public sealed class GearListConfiguration
    : IEntityTypeConfiguration<GearList>
{
    public void Configure(EntityTypeBuilder<GearList> builder)
    {
        builder.ToTable("GearLists");

        builder.HasKey(list => list.Id);

        builder.Property(list => list.Name)
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(list => list.Description)
            .HasMaxLength(1_000);

        builder.Property(list => list.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(list => list.UpdatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasIndex(list => list.OwnerId);

        builder.HasOne(list => list.Owner)
            .WithMany(user => user.GearLists)
            .HasForeignKey(list => list.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
