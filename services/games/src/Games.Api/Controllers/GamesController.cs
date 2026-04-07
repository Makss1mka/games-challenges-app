using Games.Application.Models;
using Games.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Games.Api.Controllers;

[ApiController]
[Route("api/games")]
public sealed class GamesController(GameService gameService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<GameDto>>> Search(
        [FromQuery] string? q,
        [FromQuery] string[]? tags,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await gameService.SearchAsync(q, tags, skip, take, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GameDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var game = await gameService.GetByIdAsync(id, cancellationToken);
        return game is null ? NotFound() : Ok(game);
    }

    [HttpGet("slug/{slug}")]
    public async Task<ActionResult<GameDto>> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        var game = await gameService.GetBySlugAsync(slug, cancellationToken);
        return game is null ? NotFound() : Ok(game);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<GameDto>> Create(CreateGameRequest request, CancellationToken cancellationToken)
    {
        var created = await gameService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("tags")]
    public async Task<ActionResult<IReadOnlyCollection<TagDto>>> GetTags(
        [FromQuery] string? q,
        CancellationToken cancellationToken)
    {
        var tags = await gameService.SearchTagsAsync(q, cancellationToken);
        return Ok(tags);
    }
}