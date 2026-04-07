using Microsoft.EntityFrameworkCore;
using Users.Application.Abstractions;
using Users.Domain.Entities;
using Users.Infrastructure.Persistence;

namespace Users.Infrastructure.Repositories;

public sealed class RefreshTokensRepository(UsersDbContext dbContext) : IRefreshTokensRepository
{
    public Task AddAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default)
    {
        return dbContext.RefreshTokens.AddAsync(refreshToken, cancellationToken).AsTask();
    }

    public Task<RefreshToken?> GetActiveAsync(string token, CancellationToken cancellationToken = default)
    {
        var normalized = token.Trim();

        return dbContext.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(
                x => x.Token == normalized && x.RevokedAtUtc == null,
                cancellationToken);
    }

    public async Task RevokeAllByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var tokens = await dbContext.RefreshTokens
            .Where(x => x.UserId == userId && x.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;

        foreach (var token in tokens)
            token.RevokedAtUtc = now;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}