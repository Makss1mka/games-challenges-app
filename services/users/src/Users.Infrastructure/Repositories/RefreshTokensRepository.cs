using Microsoft.EntityFrameworkCore;
using Users.Application.Abstractions;
using Users.Domain.Entities;
using Users.Infrastructure.Persistence;

namespace Users.Infrastructure.Repositories;

/// <summary>EF Core implementation of refresh tokens repository.</summary>
public sealed class RefreshTokensRepository : IRefreshTokensRepository
{
    private readonly UsersDbContext _db;

    public RefreshTokensRepository(UsersDbContext db) => _db = db;

    public Task AddAsync(RefreshToken token, CancellationToken ct) =>
        _db.RefreshTokens.AddAsync(token, ct).AsTask();

    public Task<RefreshToken?> FindValidByHashAsync(string tokenHash, CancellationToken ct) =>
        _db.RefreshTokens.FirstOrDefaultAsync(x =>
            x.TokenHash == tokenHash &&
            x.RevokedAt == null &&
            x.ExpiresAt > DateTimeOffset.UtcNow, ct);

    public Task RevokeAsync(RefreshToken token, CancellationToken ct)
    {
        token.RevokedAt = DateTimeOffset.UtcNow;
        _db.RefreshTokens.Update(token);
        return Task.CompletedTask;
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken ct)
    {
        var tokens = await _db.RefreshTokens
            .Where(x => x.UserId == userId && x.RevokedAt == null && x.ExpiresAt > DateTimeOffset.UtcNow)
            .ToListAsync(ct);

        var now = DateTimeOffset.UtcNow;
        foreach (var t in tokens) t.RevokedAt = now;
    }

    public Task SaveChangesAsync(CancellationToken ct) =>
        _db.SaveChangesAsync(ct);
}
