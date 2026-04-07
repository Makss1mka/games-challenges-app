using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Users.Api.Security;
using Users.Application.Services;

namespace Users.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me")]
public sealed class MeController(UsersService usersService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var user = await usersService.GetByIdAsync(userId, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }
}