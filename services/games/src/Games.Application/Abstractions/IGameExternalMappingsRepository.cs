using Games.Domain.Entities;
using Games.Domain.Enums;

namespace Games.Application.Abstractions;

public interface IGameExternalMappingsRepository
{
    Task<IReadOnlyDictionary<string, GameExternalMapping>> GetBySourceAndExternalIdsAsync(
        LibrarySource source,
        IReadOnlyCollection<string> externalGameIds,
        CancellationToken cancellationToken = default);

    Task AddAsync(GameExternalMapping mapping, CancellationToken cancellationToken = default);
}
