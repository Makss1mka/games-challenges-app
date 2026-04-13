using Microsoft.AspNetCore.Http;

namespace Shared.BuildingBlocks.Exceptions;

public sealed class ConflictException(string message)
    : ApiException(message, StatusCodes.Status409Conflict, "Conflict");
