using FluentAssertions;
using LoadoutQueue.Api.Middleware;
using Microsoft.AspNetCore.Http;

namespace LoadoutQueue.Api.Tests.Middleware;

public sealed class CorrelationIdMiddlewareTests
{
    [Fact]
    public async Task SuppliedCorrelationIdIsReturnedAndUsedAsTraceIdentifier()
    {
        const string correlationId = "request-42";
        string? capturedTraceIdentifier = null;

        var middleware = new CorrelationIdMiddleware(context =>
        {
            capturedTraceIdentifier = context.TraceIdentifier;
            return Task.CompletedTask;
        });

        var context = new DefaultHttpContext();
        context.Request.Headers["X-Correlation-ID"] = correlationId;

        await middleware.InvokeAsync(context);

        capturedTraceIdentifier.Should().Be(correlationId);
        context.Response.Headers["X-Correlation-ID"].ToString()
            .Should().Be(correlationId);
    }
}
