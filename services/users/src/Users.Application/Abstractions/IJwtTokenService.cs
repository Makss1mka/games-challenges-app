using Users.Domain.Entities;

namespace Users.Application.Abstractions;

/// <summary>Creates JWT access tokens for users.</summary>
public interface IJwtTokenService
{
    string CreateAccessToken(User user);
}
