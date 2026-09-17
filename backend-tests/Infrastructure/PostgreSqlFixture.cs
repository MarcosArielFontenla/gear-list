using LoadoutQueue.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Testcontainers.PostgreSql;

namespace LoadoutQueue.Api.Tests.Infrastructure;

public sealed class PostgreSqlFixture : IAsyncLifetime
{
    private PostgreSqlContainer? container;
    private readonly string? external = Environment.GetEnvironmentVariable("GEAR_LIST_TEST_CONNECTION");
    public string ConnectionString => external ?? container!.GetConnectionString();

    public async Task InitializeAsync()
    {
        if (external is null)
        {
            container = new PostgreSqlBuilder("postgres:17-alpine")
                .WithDatabase("loadout_queue_tests").WithUsername("loadout_tests")
                .WithPassword("loadout-tests-password").Build();
            await container.StartAsync();
        }
        else
        {
            var connection = new NpgsqlConnectionStringBuilder(external);
            if (connection.Host is not ("localhost" or "127.0.0.1") ||
                connection.Database?.EndsWith("_tests", StringComparison.Ordinal) != true)
                throw new InvalidOperationException("Integration tests require a local database ending in _tests.");
        }

        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(ConnectionString).Options;
        await using var database = new ApplicationDbContext(options);
        await database.Database.MigrateAsync();
    }

    public Task DisposeAsync() => container?.DisposeAsync().AsTask() ?? Task.CompletedTask;
}

[CollectionDefinition(Name)]
public sealed class PostgreSqlCollection : ICollectionFixture<PostgreSqlFixture>
{
    public const string Name = "PostgreSQL integration";
}
