using Users.Domain.Entities;

namespace Users.Application.Abstractions;

public interface IRefreshTokensRepository
{
    Task AddAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
    Task<RefreshToken?> GetActiveAsync(string token, CancellationToken cancellationToken = default);
    Task RevokeAllByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}