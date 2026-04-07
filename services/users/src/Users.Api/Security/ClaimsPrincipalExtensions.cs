using System.Security.Claims;

namespace Users.Api.Security;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? principal.FindFirstValue("sub");

        return Guid.TryParse(raw, out var userId)
            ? userId
            : throw new UnauthorizedAccessException("User id claim is missing or invalid.");
    }
}