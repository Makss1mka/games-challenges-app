using Users.Domain.Enums;

namespace Users.Domain.Entities;

public sealed class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = null!;
    public string NormalizedUsername { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public UserRole Role { get; set; }
    public UserStatus Status { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}