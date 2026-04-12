using Microsoft.AspNetCore.Http;

namespace Shared.BuildingBlocks.Exceptions;

public sealed class ForbiddenException(string message)
    : ApiException(message, StatusCodes.Status403Forbidden, "Forbidden");
