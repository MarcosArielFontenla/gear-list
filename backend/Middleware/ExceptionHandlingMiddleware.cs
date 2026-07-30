using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoadoutQueue.Api.Middleware;

public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger,
    IHostEnvironment environment)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            await WriteProblemDetailsAsync(context, exception);
        }
    }

    private async Task WriteProblemDetailsAsync(
        HttpContext context,
        Exception exception)
    {
        var (status, title) = exception switch
        {
            ArgumentException => (
                StatusCodes.Status400BadRequest,
                "La solicitud no es válida."),
            KeyNotFoundException => (
                StatusCodes.Status404NotFound,
                "No se encontró el recurso solicitado."),
            DbUpdateConcurrencyException => (
                StatusCodes.Status409Conflict,
                "El recurso fue modificado desde otra sesión."),
            _ => (
                StatusCodes.Status500InternalServerError,
                "Ocurrió un error inesperado.")
        };

        logger.Log(
            status >= StatusCodes.Status500InternalServerError
                ? LogLevel.Error
                : LogLevel.Warning,
            exception,
            "Request failed with status code {StatusCode}",
            status);

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = environment.IsDevelopment()
                ? exception.Message
                : null,
            Instance = context.Request.Path
        };

        problem.Extensions["traceId"] = context.TraceIdentifier;

        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(
            problem,
            options: null,
            contentType: "application/problem+json",
            cancellationToken: context.RequestAborted);
    }
}
