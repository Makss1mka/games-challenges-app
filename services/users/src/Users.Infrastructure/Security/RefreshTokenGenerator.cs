using System.Security.Cryptography;
using System.Text;
using Users.Application.Abstractions;

namespace Users.Infrastructure.Security;

/// <summary>Generates cryptographically secure refresh tokens and hashes them.</summary>
public sealed class RefreshTokenGenerator : IRefreshTokenGenerator
{
    public string GenerateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    public string HashRawToken(string rawToken)
    {
        // SHA-256 is OK here because raw token is random high-entropy.
        // We store only hash.
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes);
    }
}
