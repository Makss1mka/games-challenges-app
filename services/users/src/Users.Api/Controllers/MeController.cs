using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Users.Api.Security;
using Users.Application.Abstractions;

namespace Users.Api.Controllers;

/// <summary>Endpoints for current authenticated user.</summary>
[ApiController]
[Route("api/me")]
[Authorize]
public sealed class MeController : ControllerBase
{
    private readonly IUsersRepository _users;

    public MeController(IUsersRepository users) => _users = users;

    /// <summary>Returns current user profile info.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var userId = User.GetUserId();
        var user = await _users.GetByIdAsync(userId, ct);
        if (user is null) return NotFound();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.Username,
            role = user.Role.ToString(),
            status = user.Status.ToString()
        });
    }
}
