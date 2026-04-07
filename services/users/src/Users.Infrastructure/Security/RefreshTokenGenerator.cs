using System.Security.Cryptography;
using Users.Application.Abstractions;

namespace Users.Infrastructure.Security;

public sealed class RefreshTokenGenerator : IRefreshTokenGenerator
{
    public string Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }
}