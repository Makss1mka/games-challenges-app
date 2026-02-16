namespace Users.Infrastructure.Security;

/// <summary>JWT token settings.</summary>
public sealed class JwtOptions
{
    public string Issuer { get; init; } = "survival.users";
    public string Audience { get; init; } = "survival.api";
    public string Secret { get; init; } = "CHANGE_ME__MIN_32_CHARS_SECRET_KEY";
    public int AccessTokenMinutes { get; init; } = 20;
}
