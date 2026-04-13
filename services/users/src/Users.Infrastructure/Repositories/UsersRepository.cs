using Microsoft.EntityFrameworkCore;
using Users.Application.Abstractions;
using Users.Domain.Entities;
using Users.Infrastructure.Persistence;

namespace Users.Infrastructure.Repositories;

public sealed class UsersRepository(UsersDbContext dbContext) : IUsersRepository
{
    public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Users.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return dbContext.Users.FirstOrDefaultAsync(x => x.Email == normalized, cancellationToken);
    }

    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        var normalized = username.Trim().ToLowerInvariant();
        return dbContext.Users.FirstOrDefaultAsync(x => x.NormalizedUsername == normalized, cancellationToken);
    }

    public Task<User?> GetByEmailOrUsernameAsync(string value, CancellationToken cancellationToken = default)
    {
        var normalized = value.Trim().ToLowerInvariant();

        return dbContext.Users.FirstOrDefaultAsync(
            x => x.Email == normalized || x.NormalizedUsername == normalized,
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<User>> SearchAsync(
        string? query,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var users = dbContext.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalized = query.Trim().ToLowerInvariant();

            users = users.Where(x =>
                x.Username.ToLower().Contains(normalized) ||
                x.Email.ToLower().Contains(normalized));
        }

        return await users
            .OrderBy(x => x.Username)
            .Skip(skip)
            .Take(take)
            .ToArrayAsync(cancellationToken);
    }

    public Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        return dbContext.Users.AddAsync(user, cancellationToken).AsTask();
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}