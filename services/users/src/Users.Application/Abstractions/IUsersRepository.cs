using Users.Domain.Entities;

namespace Users.Application.Abstractions;

public interface IUsersRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailOrUsernameAsync(string value, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<User>> SearchAsync(
        string? query,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    Task AddAsync(User user, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}