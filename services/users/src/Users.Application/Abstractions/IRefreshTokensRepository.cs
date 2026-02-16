using Users.Domain.Entities;

namespace Users.Application.Abstractions;

/// <summary>Repository abstraction for refresh tokens.</summary>
public interface IRefreshTokensRepository
{
    Task AddAsync(RefreshToken token, CancellationToken ct);
    Task<RefreshToken?> FindValidByHashAsync(string tokenHash, CancellationToken ct);
    Task RevokeAsync(RefreshToken token, CancellationToken ct);
    Task RevokeAllForUserAsync(Guid userId, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
