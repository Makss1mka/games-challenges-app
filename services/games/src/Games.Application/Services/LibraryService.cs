using System.Text;
using Microsoft.Extensions.Logging;
using Games.Application.Abstractions;
using Games.Application.Models;
using Games.Domain.Entities;
using Games.Domain.Enums;
using Shared.BuildingBlocks.Exceptions;
using Shared.BuildingBlocks.Messaging;
using Shared.Contracts.Events;

namespace Games.Application.Services;

public sealed class LibraryService(
    ILibraryRepository libraryRepository,
    IGamesRepository gamesRepository,
    IGameExternalMappingsRepository gameExternalMappingsRepository,
    ITagsRepository tagsRepository,
    IEnumerable<IExternalLibraryProvider> externalLibraryProviders,
    IEventPublisher eventPublisher,
    ILogger<LibraryService> logger)
{
    private readonly ILogger<LibraryService> _logger = logger;
    public async Task<IReadOnlyCollection<LibraryItemDto>> GetByUserAsync(
        Guid userId,
        string? query,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        take = take switch
        {
            <= 0 => 20,
            > 100 => 100,
            _ => take
        };

        skip = skip < 0 ? 0 : skip;

        var items = await libraryRepository.GetByUserAsync(userId, query, skip, take, cancellationToken);

        return items
            .Select(static x => new LibraryItemDto(
                x.UserId,
                x.GameId,
                x.Game.Title,
                x.Game.Slug,
                x.Source,
                x.Status,
                x.AddedAtUtc))
            .ToArray();
    }

    public async Task<LibraryItemDto> AddToLibraryAsync(
        Guid userId,
        AddLibraryItemRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.GameId == Guid.Empty)
            throw new BadRequestException("Game id is required.");

        var game = await gamesRepository.GetByIdAsync(request.GameId, cancellationToken)
                   ?? throw new NotFoundException("Game not found.");

        var existing = await libraryRepository.GetAsync(userId, request.GameId, cancellationToken);
        if (existing is not null)
            throw new ConflictException("Game is already in library.");

        var item = new UserLibraryItem
        {
            UserId = userId,
            GameId = game.Id,
            Source = request.Source,
            Status = request.Status,
            AddedAtUtc = DateTimeOffset.UtcNow,
            Game = game,
        };

        await libraryRepository.AddAsync(item, cancellationToken);
        await libraryRepository.SaveChangesAsync(cancellationToken);
        await PublishLibraryItemAddedAsync(item, game, cancellationToken);

        return ToDto(item, game);
    }

    public async Task<ExternalLibraryImportResultDto> ImportSteamLibraryAsync(
        Guid userId,
        ImportSteamLibraryRequest request,
        CancellationToken cancellationToken = default)
    {
        return await ImportFromProviderAsync(
            userId,
            LibrarySource.Steam,
            request.ProfileId,
            request.ImportedGamesStatus,
            request.IncludePlayedFreeGames,
            cancellationToken);
    }

    public async Task<ExternalLibraryImportResultDto> ImportEpicGamesLibraryAsync(
        Guid userId,
        ImportEpicGamesLibraryRequest request,
        CancellationToken cancellationToken = default)
    {
        return await ImportFromProviderAsync(
            userId,
            LibrarySource.EpicGames,
            request.AccountId,
            request.ImportedGamesStatus,
            includePlayedFreeGames: false,
            cancellationToken);
    }

    public async Task<bool> RemoveFromLibraryAsync(
        Guid userId,
        Guid gameId,
        CancellationToken cancellationToken = default)
    {
        var existing = await libraryRepository.GetAsync(userId, gameId, cancellationToken);
        if (existing is null)
            return false;

        await libraryRepository.RemoveAsync(existing, cancellationToken);
        await libraryRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<ExternalLibraryImportResultDto> ImportFromProviderAsync(
        Guid userId,
        LibrarySource source,
        string profileId,
        LibraryStatus importedGamesStatus,
        bool includePlayedFreeGames,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting import from {Source} for profile {ProfileId}.", source, profileId);

        if (string.IsNullOrWhiteSpace(profileId))
            throw new BadRequestException("Profile id is required.");

        var provider = externalLibraryProviders.FirstOrDefault(x => x.Source == source)
            ?? throw new InvalidOperationException($"External provider '{source}' is not configured.");

        var snapshot = await provider.LoadLibraryAsync(
            new ExternalLibraryImportContext(profileId.Trim(), includePlayedFreeGames),
            cancellationToken);

        _logger.LogInformation("Loaded {Count} games from {Source}.", snapshot.Games.Count, source);

        var normalizedExternalGames = snapshot.Games
            .Where(static x => !string.IsNullOrWhiteSpace(x.ExternalGameId) && !string.IsNullOrWhiteSpace(x.Title))
            .GroupBy(x => x.ExternalGameId.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var first = group.First();

                return new ExternalOwnedGame(
                    group.Key,
                    first.Title.Trim(),
                    first.Description,
                    first.Developer,
                    first.Publisher,
                    first.ReleaseDate,
                    first.ImageUrl,
                    first.Tags);
            })
            .ToArray();

        var withDescriptions = normalizedExternalGames.Count(static x => !string.IsNullOrWhiteSpace(x.Description));
        var withTags = normalizedExternalGames.Count(static x => x.Tags is { Count: > 0 });
        _logger.LogInformation(
            "Steam import metadata summary: {Descriptions} descriptions, {Tags} tag sets present out of {Total} games.",
            withDescriptions,
            withTags,
            normalizedExternalGames.Length);

        var mappings = await gameExternalMappingsRepository.GetBySourceAndExternalIdsAsync(
            source,
            normalizedExternalGames.Select(static x => x.ExternalGameId).ToArray(),
            cancellationToken);

        var importedGames = new List<(Game Game, string ExternalGameId)>(normalizedExternalGames.Length);

        foreach (var externalGame in normalizedExternalGames)
        {
            if (mappings.TryGetValue(externalGame.ExternalGameId, out var existingMapping))
            {
                existingMapping.ExternalTitle = externalGame.Title;
                existingMapping.LastSyncedAtUtc = DateTimeOffset.UtcNow;
                await UpdateGameMetadataAsync(existingMapping.Game, externalGame, cancellationToken);
                importedGames.Add((existingMapping.Game, externalGame.ExternalGameId));
                continue;
            }

            var game = await gamesRepository.GetByExactTitleAsync(externalGame.Title, cancellationToken)
                       ?? await CreateImportedGameAsync(externalGame, cancellationToken);

            await UpdateGameMetadataAsync(game, externalGame, cancellationToken);

            var mapping = new GameExternalMapping
            {
                GameId = game.Id,
                Game = game,
                Source = source,
                ExternalGameId = externalGame.ExternalGameId,
                ExternalTitle = externalGame.Title,
                LastSyncedAtUtc = DateTimeOffset.UtcNow,
            };

            await gameExternalMappingsRepository.AddAsync(mapping, cancellationToken);
            importedGames.Add((game, externalGame.ExternalGameId));
        }

        var existingLibraryItems = await libraryRepository.GetByUserAndGameIdsAsync(
            userId,
            importedGames.Select(static x => x.Game.Id).Distinct().ToArray(),
            cancellationToken);

        var existingGameIds = existingLibraryItems
            .Select(static x => x.GameId)
            .ToHashSet();

        var resultGames = new List<ImportedLibraryGameDto>(importedGames.Count);
        var addedItems = new List<(UserLibraryItem Item, Game Game)>();

        foreach (var importedGame in importedGames)
        {
            var addedToLibrary = false;

            if (!existingGameIds.Contains(importedGame.Game.Id))
            {
                var item = new UserLibraryItem
                {
                    UserId = userId,
                    GameId = importedGame.Game.Id,
                    Game = importedGame.Game,
                    Source = source,
                    Status = importedGamesStatus,
                    AddedAtUtc = DateTimeOffset.UtcNow,
                };

                await libraryRepository.AddAsync(item, cancellationToken);
                existingGameIds.Add(importedGame.Game.Id);
                addedItems.Add((item, importedGame.Game));
                addedToLibrary = true;
            }

            resultGames.Add(new ImportedLibraryGameDto(
                importedGame.Game.Id,
                importedGame.Game.Title,
                importedGame.Game.Slug,
                importedGame.ExternalGameId,
                addedToLibrary));
        }

        await libraryRepository.SaveChangesAsync(cancellationToken);

        foreach (var addedItem in addedItems)
            await PublishLibraryItemAddedAsync(addedItem.Item, addedItem.Game, cancellationToken);

        return new ExternalLibraryImportResultDto(
            source.ToString(),
            snapshot.RequestedProfileId,
            snapshot.ResolvedProfileId,
            snapshot.DisplayName,
            resultGames.Count,
            addedItems.Count,
            resultGames.Count - addedItems.Count,
            resultGames);
    }

    private async Task<Game> CreateImportedGameAsync(
        ExternalOwnedGame externalGame,
        CancellationToken cancellationToken)
    {
        var tags = (await tagsRepository.GetOrCreateAsync(
                NormalizeTags(externalGame.Tags),
                cancellationToken))
            .GroupBy(static tag => tag.Id)
            .Select(static group => group.First())
            .ToArray();

        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = externalGame.Title,
            Slug = await GenerateUniqueSlugAsync(externalGame.Title, externalGame.ExternalGameId, cancellationToken),
            Description = NormalizeNullable(externalGame.Description, 4000),
            Developer = NormalizeNullable(externalGame.Developer, 256),
            Publisher = NormalizeNullable(externalGame.Publisher, 256),
            ReleaseDate = externalGame.ReleaseDate,
            ImageUrl = NormalizeNullable(externalGame.ImageUrl, 1024),
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
        return game;
    }

    private async Task<string> GenerateUniqueSlugAsync(
        string title,
        string externalGameId,
        CancellationToken cancellationToken)
    {
        var baseSlug = Slugify(title);
        if (string.IsNullOrWhiteSpace(baseSlug))
            baseSlug = $"game-{externalGameId.Trim().ToLowerInvariant()}";

        var candidate = baseSlug;
        var suffix = 2;

        while (await gamesRepository.ExistsBySlugAsync(candidate, cancellationToken))
        {
            candidate = $"{baseSlug}-{suffix}";
            suffix++;
        }

        return candidate;
    }

    private static string Slugify(string value)
    {
        var builder = new StringBuilder(value.Length);
        var previousDash = false;

        foreach (var character in value.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(character))
            {
                builder.Append(character);
                previousDash = false;
                continue;
            }

            if (previousDash)
                continue;

            builder.Append('-');
            previousDash = true;
        }

        return builder
            .ToString()
            .Trim('-');
    }

    private async Task PublishLibraryItemAddedAsync(
        UserLibraryItem item,
        Game game,
        CancellationToken cancellationToken)
    {
        await eventPublisher.PublishAsync(
            EventRoutingKeys.LibraryItemAdded,
            new LibraryItemAddedEvent(
                item.UserId,
                item.GameId,
                game.Title,
                game.Slug,
                item.Source.ToString(),
                item.Status.ToString(),
                item.AddedAtUtc),
            cancellationToken);
    }

    private static LibraryItemDto ToDto(UserLibraryItem item, Game game)
    {
        return new LibraryItemDto(
            item.UserId,
            item.GameId,
            game.Title,
            game.Slug,
            item.Source,
            item.Status,
            item.AddedAtUtc);
    }

    private async Task UpdateGameMetadataAsync(
        Game game,
        ExternalOwnedGame externalGame,
        CancellationToken cancellationToken)
    {
        var updated = false;

        if (!string.IsNullOrWhiteSpace(externalGame.Description) && ShouldReplaceDescription(game.Description, externalGame.Description))
        {
            game.Description = NormalizeNullable(externalGame.Description, 4000);
            updated = true;
        }

        if (IsMissing(game.Developer) && !string.IsNullOrWhiteSpace(externalGame.Developer))
        {
            game.Developer = NormalizeNullable(externalGame.Developer, 256);
            updated = true;
        }

        if (IsMissing(game.Publisher) && !string.IsNullOrWhiteSpace(externalGame.Publisher))
        {
            game.Publisher = NormalizeNullable(externalGame.Publisher, 256);
            updated = true;
        }

        if (!game.ReleaseDate.HasValue && externalGame.ReleaseDate.HasValue)
        {
            game.ReleaseDate = externalGame.ReleaseDate;
            updated = true;
        }

        if (string.IsNullOrWhiteSpace(game.ImageUrl) && !string.IsNullOrWhiteSpace(externalGame.ImageUrl))
        {
            game.ImageUrl = NormalizeNullable(externalGame.ImageUrl, 1024);
            updated = true;
        }

        if (externalGame.Tags is { Count: > 0 })
        {
            var normalizedTags = NormalizeTags(externalGame.Tags);
            if (normalizedTags.Count > 0)
            {
                var tags = await tagsRepository.GetOrCreateAsync(
                    normalizedTags,
                    cancellationToken);

                if (game.GameTags.Count == 0)
                {
                    game.GameTags = tags
                        .Select(tag => new GameTag
                        {
                            GameId = game.Id,
                            TagId = tag.Id,
                            Tag = tag,
                        })
                        .ToList();
                    updated = true;
                }
                else
                {
                    var existingTagIds = game.GameTags
                        .Select(static x => x.TagId)
                        .ToHashSet();

                    var newTags = tags
                        .Where(tag => !existingTagIds.Contains(tag.Id))
                        .Select(tag => new GameTag
                        {
                            GameId = game.Id,
                            TagId = tag.Id,
                            Tag = tag,
                        })
                        .ToList();

                    if (newTags.Count > 0)
                    {
                        foreach (var tag in newTags)
                            game.GameTags.Add(tag);
                        updated = true;
                    }
                }
            }
        }

        if (updated)
        {
            await gamesRepository.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Steam metadata updated for game {GameId}.", game.Id);
        }
        else
        {
            _logger.LogDebug("Steam metadata skipped for game {GameId} (no new data).", game.Id);
        }
    }

    private static IReadOnlyCollection<string> NormalizeTags(IReadOnlyCollection<string>? tags)
    {
        return (tags ?? Array.Empty<string>())
            .Where(static t => !string.IsNullOrWhiteSpace(t))
            .Select(static t => Truncate(t.Trim().ToLowerInvariant(), 128))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string? NormalizeNullable(string? value)
    {
        return NormalizeNullable(value, 1024);
    }

    private static string? NormalizeNullable(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        return Truncate(trimmed, maxLength);
    }

    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
            return value;

        return value.Length <= maxLength ? value : value[..maxLength];
    }

    private static bool IsMissing(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;

        var normalized = value.Trim().ToLowerInvariant();
        return normalized is "-" or "unknown" or "unknown studio" or "n/a" or "none" or "no description";
    }

    private static bool ShouldReplaceDescription(string? existing, string incoming)
    {
        if (string.IsNullOrWhiteSpace(incoming))
            return false;

        if (IsMissing(existing))
            return true;

        if (string.IsNullOrWhiteSpace(existing))
            return true;

        var normalizedExisting = existing.Trim();
        var normalizedIncoming = incoming.Trim();

        if (string.Equals(normalizedExisting, normalizedIncoming, StringComparison.OrdinalIgnoreCase))
            return false;

        if (normalizedExisting.Length < 25 && normalizedIncoming.Length >= 25)
            return true;

        return false;
    }
}
