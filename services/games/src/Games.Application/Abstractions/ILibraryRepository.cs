using Games.Domain.Entities;

namespace Games.Application.Abstractions;

public interface ILibraryRepository
{
    Task<IReadOnlyCollection<UserLibraryItem>> GetByUserAsync(
        Guid userId,
        string? query,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    Task<UserLibraryItem?> GetAsync(Guid userId, Guid gameId, CancellationToken cancellationToken = default);
    Task AddAsync(UserLibraryItem item, CancellationToken cancellationToken = default);
    Task RemoveAsync(UserLibraryItem item, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}