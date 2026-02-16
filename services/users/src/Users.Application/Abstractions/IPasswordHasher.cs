namespace Users.Application.Abstractions;

/// <summary>Provides password hashing/verification.</summary>
public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
}
