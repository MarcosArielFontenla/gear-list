using LoadoutQueue.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadoutQueue.Api.Persistence.Configurations;

public sealed class GearItemConfiguration
    : IEntityTypeConfiguration<GearItem>
{
    public void Configure(EntityTypeBuilder<GearItem> builder)
    {
        builder.ToTable(
            "GearItems",
            table =>
            {
                table.HasCheckConstraint(
                    "CK_GearItems_EstimatedPrice_NonNegative",
                    "\"EstimatedPrice\" IS NULL OR \"EstimatedPrice\" >= 0");
                table.HasCheckConstraint(
                    "CK_GearItems_ActualPrice_NonNegative",
                    "\"ActualPrice\" IS NULL OR \"ActualPrice\" >= 0");
                table.HasCheckConstraint(
                    "CK_GearItems_Position_NonNegative",
                    "\"Position\" >= 0");
            });

        builder.HasKey(item => item.Id);

        builder.Property(item => item.Name)
            .HasMaxLength(160)
            .IsRequired();

        builder.Property(item => item.Description)
            .HasMaxLength(2_000);

        builder.Property(item => item.EstimatedPrice)
            .HasPrecision(18, 2);

        builder.Property(item => item.ActualPrice)
            .HasPrecision(18, 2);

        builder.Property(item => item.ProductUrl)
            .HasMaxLength(2_048);

        builder.Property(item => item.ImageUrl)
            .HasMaxLength(2_048);

        builder.Property(item => item.StoreName)
            .HasMaxLength(120);

        builder.Property(item => item.Notes)
            .HasMaxLength(4_000);

        builder.Property(item => item.Position)
            .HasDefaultValue(0);

        builder.Property(item => item.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(item => item.UpdatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(item => item.Version)
            .HasDefaultValueSql("gen_random_uuid()")
            .IsConcurrencyToken();

        builder.HasIndex(item => item.GearListId);
        builder.HasIndex(item => item.Priority);
        builder.HasIndex(item => item.Status);
        builder.HasIndex(item => item.Position);

        builder.HasOne(item => item.GearList)
            .WithMany(list => list.Items)
            .HasForeignKey(item => item.GearListId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
