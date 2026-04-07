using Games.Application.Abstractions;
using Games.Application.Models;
using Games.Domain.Entities;

namespace Games.Application.Services;

public sealed class LibraryService(
    ILibraryRepository libraryRepository,
    IGamesRepository gamesRepository)
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
        var game = await gamesRepository.GetByIdAsync(request.GameId, cancellationToken)
                   ?? throw new InvalidOperationException("Game not found.");

        var existing = await libraryRepository.GetAsync(userId, request.GameId, cancellationToken);
        if (existing is not null)
            throw new InvalidOperationException("Game is already in library.");

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

        return new LibraryItemDto(
            item.UserId,
            item.GameId,
            game.Title,
            game.Slug,
            item.Source,
            item.Status,
            item.AddedAtUtc);
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
}