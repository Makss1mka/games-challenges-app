using Users.Domain.Entities;

namespace Users.Application.Abstractions;

public interface IJwtTokenService
{
    string GenerateAccessToken(User user);
}