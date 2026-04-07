using Games.Domain.Entities;

namespace Games.Application.Abstractions;

public interface ITagsRepository
{
    Task<IReadOnlyCollection<Tag>> SearchAsync(string? query, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<Tag>> GetOrCreateAsync(IReadOnlyCollection<string> names, CancellationToken cancellationToken = default);
    Task<Tag?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}