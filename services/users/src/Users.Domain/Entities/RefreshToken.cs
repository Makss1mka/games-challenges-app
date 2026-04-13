namespace Users.Domain.Entities;

public sealed class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Token { get; set; } = null!;
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public DateTimeOffset? RevokedAtUtc { get; set; }
}