using Games.Application.Abstractions;
using Games.Domain.Entities;
using Games.Domain.Enums;
using Games.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Games.Infrastructure.Repositories;

public sealed class GameExternalMappingsRepository(GamesDbContext dbContext) : IGameExternalMappingsRepository
{
    public async Task<IReadOnlyDictionary<string, GameExternalMapping>> GetBySourceAndExternalIdsAsync(
        LibrarySource source,
        IReadOnlyCollection<string> externalGameIds,
        CancellationToken cancellationToken = default)
    {
        if (externalGameIds.Count == 0)
            return new Dictionary<string, GameExternalMapping>(StringComparer.OrdinalIgnoreCase);

        var normalizedIds = externalGameIds
            .Where(static x => !string.IsNullOrWhiteSpace(x))
            .Select(static x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var mappings = await dbContext.GameExternalMappings
            .Include(x => x.Game)
                .ThenInclude(x => x.GameTags)
                    .ThenInclude(x => x.Tag)
            .Where(x => x.Source == source && normalizedIds.Contains(x.ExternalGameId))
            .ToArrayAsync(cancellationToken);

        return mappings.ToDictionary(x => x.ExternalGameId, StringComparer.OrdinalIgnoreCase);
    }

    public Task AddAsync(GameExternalMapping mapping, CancellationToken cancellationToken = default)
    {
        return dbContext.GameExternalMappings.AddAsync(mapping, cancellationToken).AsTask();
    }
}
