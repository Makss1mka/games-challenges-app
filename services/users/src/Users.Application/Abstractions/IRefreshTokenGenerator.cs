namespace Users.Application.Abstractions;

/// <summary>Generates secure refresh tokens.</summary>
public interface IRefreshTokenGenerator
{
    string GenerateRawToken();
    string HashRawToken(string rawToken);
}
