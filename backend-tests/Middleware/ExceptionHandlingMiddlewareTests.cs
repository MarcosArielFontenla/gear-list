using System.Text.Json;
using FluentAssertions;
using LoadoutQueue.Api.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace LoadoutQueue.Api.Tests.Middleware;

public sealed class ExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task ConcurrencyExceptionReturnsConflictProblemDetails()
    {
        var context = CreateContext();
        var middleware = new ExceptionHandlingMiddleware(
            _ => throw new DbUpdateConcurrencyException("Stale version."),
            NullLogger<ExceptionHandlingMiddleware>.Instance,
            new TestHostEnvironment(Environments.Production));

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(StatusCodes.Status409Conflict);
        context.Response.ContentType.Should().StartWith("application/problem+json");

        var problem = await ReadResponseAsync(context);
        problem.GetProperty("status").GetInt32().Should().Be(409);
        problem.GetProperty("traceId").GetString().Should().Be("trace-123");
        problem.TryGetProperty("detail", out _).Should().BeFalse();
    }

    [Fact]
    public async Task UnexpectedExceptionHidesDetailsOutsideDevelopment()
    {
        var context = CreateContext();
        var middleware = new ExceptionHandlingMiddleware(
            _ => throw new InvalidOperationException("Sensitive detail."),
            NullLogger<ExceptionHandlingMiddleware>.Instance,
            new TestHostEnvironment(Environments.Production));

        await middleware.InvokeAsync(context);

        var problem = await ReadResponseAsync(context);
        problem.GetProperty("status").GetInt32().Should().Be(500);
        problem.GetProperty("title").GetString()
            .Should().Be("Ocurrió un error inesperado.");
        problem.TryGetProperty("detail", out _).Should().BeFalse();
    }

    private static DefaultHttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        context.TraceIdentifier = "trace-123";
        context.Request.Path = "/api/test";
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static async Task<JsonElement> ReadResponseAsync(HttpContext context)
    {
        context.Response.Body.Position = 0;
        using var document = await JsonDocument.ParseAsync(context.Response.Body);
        return document.RootElement.Clone();
    }

    private sealed class TestHostEnvironment(string environmentName)
        : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "LoadoutQueue.Api.Tests";

        public string ContentRootPath { get; set; } = string.Empty;

        public IFileProvider ContentRootFileProvider { get; set; } =
            new NullFileProvider();
    }
}
