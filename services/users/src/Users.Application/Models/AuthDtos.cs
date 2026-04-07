using Users.Domain.Enums;

namespace Users.Application.Models;

public sealed record RegisterRequest(
    string Username,
    string Email,
    string Password);

public sealed record LoginRequest(
    string Login,
    string Password);

public sealed record RefreshTokenRequest(
    string RefreshToken);

public sealed record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset ExpiresAtUtc,
    UserDto User);

public sealed record UserDto(
    Guid Id,
    string Username,
    string Email,
    UserRole Role,
    UserStatus Status,
    DateTimeOffset CreatedAtUtc);