using Games.Application.Abstractions;
using Games.Application.Models;
using Games.Domain.Entities;
using Shared.BuildingBlocks.Exceptions;
using Shared.BuildingBlocks.Messaging;
using Shared.Contracts.Events;

namespace Games.Application.Services;

public sealed class GameService(
    IGamesRepository gamesRepository,
    ITagsRepository tagsRepository,
    IEventPublisher eventPublisher)
{
    public async Task<IReadOnlyCollection<GameDto>> SearchAsync(
        string? query,
        IReadOnlyCollection<string>? tags,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        take = NormalizeTake(take);
        skip = NormalizeSkip(skip);

        var games = await gamesRepository.SearchAsync(query, tags, skip, take, cancellationToken);

        return games
            .Select(MapGame)
            .ToArray();
    }

    public async Task<GameDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var game = await gamesRepository.GetByIdAsync(id, cancellationToken);
        return game is null ? null : MapGame(game);
    }

    public async Task<GameDto?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
            return null;

        var game = await gamesRepository.GetBySlugAsync(slug.Trim(), cancellationToken);
        return game is null ? null : MapGame(game);
    }

    public async Task<IReadOnlyCollection<TagDto>> SearchTagsAsync(
        string? query,
        CancellationToken cancellationToken = default)
    {
        var tags = await tagsRepository.SearchAsync(query, cancellationToken);

        return tags
            .Select(static t => new TagDto(t.Id, t.Name))
            .ToArray();
    }

    public async Task<GameDto> CreateAsync(
        CreateGameRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateCreateRequest(request);

        var normalizedSlug = request.Slug.Trim().ToLowerInvariant();

        if (await gamesRepository.ExistsBySlugAsync(normalizedSlug, cancellationToken))
            throw new ConflictException($"Game with slug '{normalizedSlug}' already exists.");

        var tags = await tagsRepository.GetOrCreateAsync(
            NormalizeTags(request.Tags),
            cancellationToken);

        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Slug = normalizedSlug,
            Description = NormalizeNullable(request.Description),
            Developer = NormalizeNullable(request.Developer),
            Publisher = NormalizeNullable(request.Publisher),
            ReleaseDate = request.ReleaseDate,
            GameTags = tags
                .Select(tag => new GameTag
                {
                    GameId = Guid.Empty,
                    TagId = tag.Id,
                    Tag = tag,
                })
                .ToList(),
        };

        await gamesRepository.AddAsync(game, cancellationToken);
        await gamesRepository.SaveChangesAsync(cancellationToken);
        await eventPublisher.PublishAsync(
            EventRoutingKeys.GameCreated,
            new GameCreatedEvent(
                game.Id,
                game.Title,
                game.Slug,
                game.GameTags
                    .Select(gt => gt.Tag.Name)
                    .OrderBy(static x => x)
                    .ToArray()),
            cancellationToken);

        return MapGame(game);
    }

    private static GameDto MapGame(Game game)
    {
        return new GameDto(
            game.Id,
            game.Title,
            game.Slug,
            game.Description,
            game.Developer,
            game.Publisher,
            game.ReleaseDate,
            game.GameTags
                .Select(gt => gt.Tag.Name)
                .OrderBy(static x => x)
                .ToArray());
    }

    private static void ValidateCreateRequest(CreateGameRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new BadRequestException("Title is required.");

        if (string.IsNullOrWhiteSpace(request.Slug))
            throw new BadRequestException("Slug is required.");
    }

    private static IReadOnlyCollection<string> NormalizeTags(IReadOnlyCollection<string>? tags)
    {
        return (tags ?? Array.Empty<string>())
            .Where(static t => !string.IsNullOrWhiteSpace(t))
            .Select(static t => t.Trim().ToLowerInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string? NormalizeNullable(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static int NormalizeTake(int take) => take switch
    {
        <= 0 => 20,
        > 100 => 100,
        _ => take
    };

    private static int NormalizeSkip(int skip) => skip < 0 ? 0 : skip;
}
