using Serilog.Context;

namespace LoadoutQueue.Api.Middleware;

public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string HeaderName = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = GetCorrelationId(context);
        context.TraceIdentifier = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await next(context);
        }
    }

    private static string GetCorrelationId(HttpContext context)
    {
        var suppliedId = context.Request.Headers[HeaderName].FirstOrDefault();

        return string.IsNullOrWhiteSpace(suppliedId)
            ? Guid.NewGuid().ToString("N")
            : suppliedId.Trim();
    }
}
