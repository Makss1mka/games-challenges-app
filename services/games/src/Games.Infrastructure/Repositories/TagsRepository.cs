using Games.Application.Abstractions;
using Games.Domain.Entities;
using Games.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Games.Infrastructure.Repositories;

public sealed class TagsRepository(GamesDbContext dbContext) : ITagsRepository
{
    public async Task<IReadOnlyCollection<Tag>> SearchAsync(
        string? query,
        CancellationToken cancellationToken = default)
    {
        var tags = dbContext.Tags
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalized = query.Trim().ToLower();
            tags = tags.Where(x => x.Name.ToLower().Contains(normalized));
        }

        return await tags
            .OrderBy(x => x.Name)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Tag>> GetOrCreateAsync(
        IReadOnlyCollection<string> names,
        CancellationToken cancellationToken = default)
    {
        if (names.Count == 0)
            return Array.Empty<Tag>();

        var normalized = names
            .Where(static x => !string.IsNullOrWhiteSpace(x))
            .Select(static x => x.Trim().ToLower())
            .Distinct()
            .ToArray();

        if (normalized.Length == 0)
            return Array.Empty<Tag>();

        var existing = await dbContext.Tags
            .Where(x => normalized.Contains(x.Name))
            .ToListAsync(cancellationToken);

        var existingNames = existing
            .Select(x => x.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var created = normalized
            .Where(x => !existingNames.Contains(x))
            .Select(x => new Tag
            {
                Id = Guid.NewGuid(),
                Name = x,
            })
            .ToArray();

        if (created.Length > 0)
            await dbContext.Tags.AddRangeAsync(created, cancellationToken);

        return existing
            .Concat(created)
            .ToArray();
    }

    public Task<Tag?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        var normalized = name.Trim().ToLower();
        return dbContext.Tags.FirstOrDefaultAsync(x => x.Name == normalized, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}