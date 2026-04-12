using Games.Application.Abstractions;
using Games.Domain.Entities;
using Games.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Games.Infrastructure.Repositories;

public sealed class GamesRepository(GamesDbContext dbContext) : IGamesRepository
{
    public async Task<IReadOnlyCollection<Game>> SearchAsync(
        string? query,
        IReadOnlyCollection<string>? tags,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var gamesQuery = dbContext.Games
            .AsNoTracking()
            .Include(x => x.GameTags)
                .ThenInclude(x => x.Tag)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalized = query.Trim().ToLower();

            gamesQuery = gamesQuery.Where(x =>
                x.Title.ToLower().Contains(normalized) ||
                (x.Developer != null && x.Developer.ToLower().Contains(normalized)) ||
                (x.Publisher != null && x.Publisher.ToLower().Contains(normalized)));
        }

        if (tags is { Count: > 0 })
        {
            var normalizedTags = tags
                .Where(static x => !string.IsNullOrWhiteSpace(x))
                .Select(static x => x.Trim().ToLower())
                .Distinct()
                .ToArray();

            if (normalizedTags.Length > 0)
            {
                gamesQuery = gamesQuery.Where(game =>
                    game.GameTags.Any(gt => normalizedTags.Contains(gt.Tag.Name.ToLower())));
            }
        }

        return await gamesQuery
            .OrderBy(x => x.Title)
            .Skip(skip)
            .Take(take)
            .ToArrayAsync(cancellationToken);
    }

    public Task<Game?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Games
            .Include(x => x.GameTags)
                .ThenInclude(x => x.Tag)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<Game?> GetByExactTitleAsync(string title, CancellationToken cancellationToken = default)
    {
        var normalized = title.Trim().ToLower();

        return dbContext.Games
            .Include(x => x.GameTags)
                .ThenInclude(x => x.Tag)
            .FirstOrDefaultAsync(x => x.Title.ToLower() == normalized, cancellationToken);
    }

    public Task<Game?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var normalized = slug.Trim().ToLower();

        return dbContext.Games
            .Include(x => x.GameTags)
                .ThenInclude(x => x.Tag)
            .FirstOrDefaultAsync(x => x.Slug == normalized, cancellationToken);
    }

    public Task<bool> ExistsBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var normalized = slug.Trim().ToLower();
        return dbContext.Games.AnyAsync(x => x.Slug == normalized, cancellationToken);
    }

    public Task AddAsync(Game game, CancellationToken cancellationToken = default)
    {
        return dbContext.Games.AddAsync(game, cancellationToken).AsTask();
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
