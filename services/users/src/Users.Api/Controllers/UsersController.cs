using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Users.Application.Services;

namespace Users.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public sealed class UsersController(UsersService usersService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        CancellationToken cancellationToken = default)
    {
        var users = await usersService.SearchAsync(q, skip, take, cancellationToken);
        return Ok(users);
    }
}