using System.Security.Claims;

namespace Users.Api.Security;

/// <summary>Helpers to read typed claims.</summary>
public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.Parse(sub!);
    }
}
