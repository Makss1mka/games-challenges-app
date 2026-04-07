using Games.Application.Abstractions;
using Games.Domain.Entities;
using Games.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Games.Infrastructure.Repositories;

public sealed class LibraryRepository(GamesDbContext dbContext) : ILibraryRepository
{
    public async Task<IReadOnlyCollection<UserLibraryItem>> GetByUserAsync(
        Guid userId,
        string? query,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var items = dbContext.UserLibraryItems
            .AsNoTracking()
            .Include(x => x.Game)
            .Where(x => x.UserId == userId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalized = query.Trim().ToLower();
            items = items.Where(x => x.Game.Title.ToLower().Contains(normalized));
        }

        return await items
            .OrderByDescending(x => x.AddedAtUtc)
            .Skip(skip)
            .Take(take)
            .ToArrayAsync(cancellationToken);
    }

    public Task<UserLibraryItem?> GetAsync(Guid userId, Guid gameId, CancellationToken cancellationToken = default)
    {
        return dbContext.UserLibraryItems
            .Include(x => x.Game)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.GameId == gameId, cancellationToken);
    }

    public Task AddAsync(UserLibraryItem item, CancellationToken cancellationToken = default)
    {
        return dbContext.UserLibraryItems.AddAsync(item, cancellationToken).AsTask();
    }

    public Task RemoveAsync(UserLibraryItem item, CancellationToken cancellationToken = default)
    {
        dbContext.UserLibraryItems.Remove(item);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}