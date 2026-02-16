namespace Users.Application.Models;

/// <summary>Register request.</summary>
public sealed record RegisterRequest(string Email, string Password, string? Username);

/// <summary>Login request.</summary>
public sealed record LoginRequest(string Email, string Password);

/// <summary>Auth response with access and refresh tokens.</summary>
public sealed record AuthResponse(string AccessToken, string RefreshToken);

/// <summary>Refresh request.</summary>
public sealed record RefreshRequest(string RefreshToken);
