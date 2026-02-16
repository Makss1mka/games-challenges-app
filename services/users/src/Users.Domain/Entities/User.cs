using Users.Domain.Enums;

namespace Users.Domain.Entities;

/// <summary>Represents an application user account.</summary>
public sealed class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string? Username { get; set; }
    public string PasswordHash { get; set; } = default!;
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsEmailConfirmed { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Active;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
