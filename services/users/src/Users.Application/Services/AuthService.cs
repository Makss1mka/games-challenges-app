using Shared.BuildingBlocks.Messaging;
using Shared.Contracts.Events;
using Users.Application.Abstractions;
using Users.Application.Models;
using Users.Domain.Entities;

namespace Users.Application.Services;

/// <summary>Authentication use-cases (register/login/refresh/logout).</summary>
public sealed class AuthService
{
    private readonly IUsersRepository _users;
    private readonly IRefreshTokensRepository _tokens;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtTokenService _jwt;
    private readonly IRefreshTokenGenerator _refreshGen;
    private readonly IEventPublisher _publisher;

    public AuthService(
        IUsersRepository users,
        IRefreshTokensRepository tokens,
        IPasswordHasher hasher,
        IJwtTokenService jwt,
        IRefreshTokenGenerator refreshGen,
        IEventPublisher publisher)
    {
        _users = users;
        _tokens = tokens;
        _hasher = hasher;
        _jwt = jwt;
        _refreshGen = refreshGen;
        _publisher = publisher;
    }

    /// <summary>Registers a new user and returns tokens.</summary>
    public async Task<AuthResponse> RegisterAsync(RegisterRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();

        if (await _users.EmailExistsAsync(email, ct))
            throw new InvalidOperationException("Email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Username = string.IsNullOrWhiteSpace(req.Username) ? null : req.Username.Trim(),
            PasswordHash = _hasher.Hash(req.Password),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await _users.AddAsync(user, ct);
        await _users.SaveChangesAsync(ct);

        // refresh token
        var rawRefresh = _refreshGen.GenerateRawToken();
        var refreshHash = _refreshGen.HashRawToken(rawRefresh);

        var rt = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = refreshHash,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(30)
        };

        await _tokens.AddAsync(rt, ct);
        await _tokens.SaveChangesAsync(ct);

        // publish event
        await _publisher.PublishAsync(new UserRegistered(user.Id, user.Email, DateTimeOffset.UtcNow), ct);

        var access = _jwt.CreateAccessToken(user);
        return new AuthResponse(access, rawRefresh);
    }

    /// <summary>Validates credentials and returns tokens.</summary>
    public async Task<AuthResponse> LoginAsync(LoginRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await _users.GetByEmailAsync(email, ct);

        if (user is null)
            throw new InvalidOperationException("Invalid credentials.");

        if (!_hasher.Verify(req.Password, user.PasswordHash))
            throw new InvalidOperationException("Invalid credentials.");

        var rawRefresh = _refreshGen.GenerateRawToken();
        var refreshHash = _refreshGen.HashRawToken(rawRefresh);

        var rt = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = refreshHash,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(30)
        };

        await _tokens.AddAsync(rt, ct);
        await _tokens.SaveChangesAsync(ct);

        var access = _jwt.CreateAccessToken(user);
        return new AuthResponse(access, rawRefresh);
    }

    /// <summary>Rotates refresh token and returns new tokens.</summary>
    public async Task<AuthResponse> RefreshAsync(RefreshRequest req, CancellationToken ct)
    {
        var hash = _refreshGen.HashRawToken(req.RefreshToken);
        var token = await _tokens.FindValidByHashAsync(hash, ct);

        if (token is null)
            throw new InvalidOperationException("Invalid refresh token.");

        // revoke old token (rotation)
        await _tokens.RevokeAsync(token, ct);

        var user = await _users.GetByIdAsync(token.UserId, ct)
                   ?? throw new InvalidOperationException("User not found.");

        var newRaw = _refreshGen.GenerateRawToken();
        var newHash = _refreshGen.HashRawToken(newRaw);

        await _tokens.AddAsync(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = newHash,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(30)
        }, ct);

        await _tokens.SaveChangesAsync(ct);

        var access = _jwt.CreateAccessToken(user);
        return new AuthResponse(access, newRaw);
    }

    /// <summary>Revokes all refresh tokens for a user (logout everywhere).</summary>
    public async Task LogoutAllAsync(Guid userId, CancellationToken ct)
    {
        await _tokens.RevokeAllForUserAsync(userId, ct);
        await _tokens.SaveChangesAsync(ct);
    }
}
