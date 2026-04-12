using Microsoft.AspNetCore.Http;

namespace Shared.BuildingBlocks.Exceptions;

public sealed class BadRequestException(string message)
    : ApiException(message, StatusCodes.Status400BadRequest, "Bad Request");
