using Users.Application.Abstractions;
using Users.Application.Models;

namespace Users.Application.Services;

public sealed class UsersService(IUsersRepository usersRepository)
{
    public async Task<UserDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await usersRepository.GetByIdAsync(id, cancellationToken);
        return user is null ? null : Map(user);
    }

    public async Task<IReadOnlyCollection<UserDto>> SearchAsync(
        string? query,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        take = take switch
        {
            <= 0 => 20,
            > 100 => 100,
            _ => take
        };

        skip = skip < 0 ? 0 : skip;

        var users = await usersRepository.SearchAsync(query, skip, take, cancellationToken);
        return users.Select(Map).ToArray();
    }

    private static UserDto Map(Users.Domain.Entities.User user)
    {
        return new UserDto(
            user.Id,
            user.Username,
            user.Email,
            user.Role,
            user.Status,
            user.CreatedAtUtc);
    }
}