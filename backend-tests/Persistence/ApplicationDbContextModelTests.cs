using FluentAssertions;
using LoadoutQueue.Api.Domain.Entities;
using LoadoutQueue.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace LoadoutQueue.Api.Tests.Persistence;

public sealed class ApplicationDbContextModelTests
{
    private const string ConnectionString =
        "Host=localhost;Database=loadout_queue_tests;Username=loadout";

    [Fact]
    public void GearItemPricesUseMoneyPrecision()
    {
        using var context = CreateContext();
        var entity = context.Model.FindEntityType(typeof(GearItem));

        var estimatedPrice = entity!.FindProperty(nameof(GearItem.EstimatedPrice));
        var actualPrice = entity.FindProperty(nameof(GearItem.ActualPrice));

        estimatedPrice!.GetPrecision().Should().Be(18);
        estimatedPrice.GetScale().Should().Be(2);
        actualPrice!.GetPrecision().Should().Be(18);
        actualPrice.GetScale().Should().Be(2);
    }

    [Fact]
    public void GearItemVersionIsAConcurrencyToken()
    {
        using var context = CreateContext();
        var entity = context.Model.FindEntityType(typeof(GearItem));

        entity!
            .FindProperty(nameof(GearItem.Version))!
            .IsConcurrencyToken
            .Should()
            .BeTrue();
    }

    [Fact]
    public void DomainRelationshipsUseRestrictDeleteBehavior()
    {
        using var context = CreateContext();

        var listRelationship = context.Model
            .FindEntityType(typeof(GearList))!
            .GetForeignKeys()
            .Single(key => key.PrincipalEntityType.ClrType == typeof(ApplicationUser));

        var itemRelationship = context.Model
            .FindEntityType(typeof(GearItem))!
            .GetForeignKeys()
            .Single(key => key.PrincipalEntityType.ClrType == typeof(GearList));

        listRelationship.DeleteBehavior.Should().Be(DeleteBehavior.Restrict);
        itemRelationship.DeleteBehavior.Should().Be(DeleteBehavior.Restrict);
    }

    [Fact]
    public void GearItemQueryIndexesAreConfigured()
    {
        using var context = CreateContext();
        var indexes = context.Model
            .FindEntityType(typeof(GearItem))!
            .GetIndexes()
            .Select(index => index.Properties.Single().Name)
            .ToArray();

        indexes.Should().Contain(
            [
                nameof(GearItem.GearListId),
                nameof(GearItem.Priority),
                nameof(GearItem.Status),
                nameof(GearItem.Position)
            ]);
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;

        return new ApplicationDbContext(options);
    }
}
