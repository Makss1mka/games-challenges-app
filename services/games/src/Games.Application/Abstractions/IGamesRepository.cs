using Games.Domain.Entities;

namespace Games.Application.Abstractions;

public interface IGamesRepository
{
    Task<IReadOnlyCollection<Game>> SearchAsync(
        string? query,
        IReadOnlyCollection<string>? tags,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    Task<Game?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Game?> GetByExactTitleAsync(string title, CancellationToken cancellationToken = default);
    Task<Game?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<bool> ExistsBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task AddAsync(Game game, CancellationToken cancellationToken = default);
    Task RemoveAsync(Game game, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
