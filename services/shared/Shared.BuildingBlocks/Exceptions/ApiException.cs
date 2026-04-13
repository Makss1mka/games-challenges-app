namespace Shared.BuildingBlocks.Exceptions;

public abstract class ApiException(
    string message,
    int statusCode,
    string title) : Exception(message)
{
    public int StatusCode { get; } = statusCode;

    public string Title { get; } = title;
}
