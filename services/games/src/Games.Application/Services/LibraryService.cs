using System.Text;
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
    IEnumerable<IExternalLibraryProvider> externalLibraryProviders,
    IEventPublisher eventPublisher)
{
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
        if (string.IsNullOrWhiteSpace(profileId))
            throw new BadRequestException("Profile id is required.");

        var provider = externalLibraryProviders.FirstOrDefault(x => x.Source == source)
            ?? throw new InvalidOperationException($"External provider '{source}' is not configured.");

        var snapshot = await provider.LoadLibraryAsync(
            new ExternalLibraryImportContext(profileId.Trim(), includePlayedFreeGames),
            cancellationToken);

        var normalizedExternalGames = snapshot.Games
            .Where(static x => !string.IsNullOrWhiteSpace(x.ExternalGameId) && !string.IsNullOrWhiteSpace(x.Title))
            .GroupBy(x => x.ExternalGameId.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var first = group.First();

                return new ExternalOwnedGame(
                    group.Key,
                    first.Title.Trim());
            })
            .ToArray();

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
                importedGames.Add((existingMapping.Game, externalGame.ExternalGameId));
                continue;
            }

            var game = await gamesRepository.GetByExactTitleAsync(externalGame.Title, cancellationToken)
                       ?? await CreateImportedGameAsync(externalGame, cancellationToken);

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
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = externalGame.Title,
            Slug = await GenerateUniqueSlugAsync(externalGame.Title, externalGame.ExternalGameId, cancellationToken),
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
}
