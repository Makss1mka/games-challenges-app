using Games.Api.Security;
using Games.Application.Models;
using Games.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Games.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/library")]
public sealed class LibraryController(LibraryService libraryService) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<IReadOnlyCollection<LibraryItemDto>>> GetMine(
        [FromQuery] string? q,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        var items = await libraryService.GetByUserAsync(userId, q, skip, take, cancellationToken);
        return Ok(items);
    }

    [HttpPost("me")]
    public async Task<ActionResult<LibraryItemDto>> AddMine(
        AddLibraryItemRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var item = await libraryService.AddToLibraryAsync(userId, request, cancellationToken);
        return Ok(item);
    }

    [HttpDelete("me/{gameId:guid}")]
    public async Task<IActionResult> RemoveMine(Guid gameId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var deleted = await libraryService.RemoveFromLibraryAsync(userId, gameId, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}