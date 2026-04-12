using System.Net.Sockets;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client.Exceptions;

namespace Shared.BuildingBlocks.Exceptions;

public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, title, detail) = MapException(exception);

        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(
                exception,
                "Unhandled exception while processing {Method} {Path}",
                httpContext.Request.Method,
                httpContext.Request.Path);
        }
        else
        {
            logger.LogWarning(
                exception,
                "Handled exception while processing {Method} {Path}",
                httpContext.Request.Method,
                httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = httpContext.Request.Path,
        };

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }

    private static (int StatusCode, string Title, string Detail) MapException(Exception exception)
    {
        return exception switch
        {
            ApiException apiException => (apiException.StatusCode, apiException.Title, apiException.Message),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized", exception.Message),
            NotSupportedException => (StatusCodes.Status501NotImplemented, "Not Implemented", exception.Message),
            InvalidOperationException => (StatusCodes.Status400BadRequest, "Bad Request", exception.Message),
            BrokerUnreachableException => (
                StatusCodes.Status503ServiceUnavailable,
                "Service Unavailable",
                "RabbitMQ is unavailable right now."),
            SocketException => (
                StatusCodes.Status503ServiceUnavailable,
                "Service Unavailable",
                "Dependent network service is unavailable right now."),
            TimeoutException => (
                StatusCodes.Status503ServiceUnavailable,
                "Service Unavailable",
                "The dependent service did not respond in time."),
            _ => (
                StatusCodes.Status500InternalServerError,
                "Internal Server Error",
                "An unexpected error occurred.")
        };
    }
}
