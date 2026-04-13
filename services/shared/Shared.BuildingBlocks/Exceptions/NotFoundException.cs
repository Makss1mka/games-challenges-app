using Microsoft.AspNetCore.Http;

namespace Shared.BuildingBlocks.Exceptions;

public sealed class NotFoundException(string message)
    : ApiException(message, StatusCodes.Status404NotFound, "Not Found");
