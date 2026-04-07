using Games.Api.Security;
using System.Security.Claims;
using Users.Application.Abstractions;
using Users.Application.Models;
using Users.Domain.Entities;
using Users.Domain.Enums;

namespace Users.Application.Services;

public sealed class AuthService(
    IUsersRepository usersRepository,
    IRefreshTokensRepository refreshTokensRepository,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokenService,
    IRefreshTokenGenerator refreshTokenGenerator)
{
    public async Task<AuthResponse> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateRegisterRequest(request);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedUsername = request.Username.Trim().ToLowerInvariant();

        if (await usersRepository.GetByEmailAsync(normalizedEmail, cancellationToken) is not null)
            throw new InvalidOperationException("Email is already registered.");

        if (await usersRepository.GetByUsernameAsync(normalizedUsername, cancellationToken) is not null)
            throw new InvalidOperationException("Username is already taken.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username.Trim(),
            NormalizedUsername = normalizedUsername,
            Email = normalizedEmail,
            PasswordHash = passwordHasher.Hash(request.Password),
            Role = UserRole.User,
            Status = UserStatus.Active,
            CreatedAtUtc = DateTimeOffset.UtcNow,
        };

        await usersRepository.AddAsync(user, cancellationToken);
        await usersRepository.SaveChangesAsync(cancellationToken);

        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Login))
            throw new InvalidOperationException("Login is required.");

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new InvalidOperationException("Password is required.");

        var user = await usersRepository.GetByEmailOrUsernameAsync(request.Login.Trim(), cancellationToken)
                   ?? throw new InvalidOperationException("Invalid credentials.");

        if (!passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new InvalidOperationException("Invalid credentials.");

        if (user.Status is not UserStatus.Active)
            throw new InvalidOperationException("User is not active.");

        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> RefreshAsync(
        RefreshTokenRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new InvalidOperationException("Refresh token is required.");

        var existing = await refreshTokensRepository.GetActiveAsync(request.RefreshToken.Trim(), cancellationToken)
                      ?? throw new InvalidOperationException("Refresh token is invalid.");

        if (existing.ExpiresAtUtc <= DateTimeOffset.UtcNow)
            throw new InvalidOperationException("Refresh token is expired.");

        existing.RevokedAtUtc = DateTimeOffset.UtcNow;
        await refreshTokensRepository.SaveChangesAsync(cancellationToken);

        return await IssueTokensAsync(existing.User, cancellationToken);
    }

    public async Task RevokeAllAsync(
        ClaimsPrincipal principal,
        CancellationToken cancellationToken = default)
    {
        var userId = principal.GetUserId();
        await refreshTokensRepository.RevokeAllByUserIdAsync(userId, cancellationToken);
        await refreshTokensRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task<AuthResponse> IssueTokensAsync(
        User user,
        CancellationToken cancellationToken)
    {
        var accessToken = jwtTokenService.GenerateAccessToken(user);
        var refreshTokenValue = refreshTokenGenerator.Generate();
        var expiresAtUtc = DateTimeOffset.UtcNow.AddDays(30);

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAtUtc = expiresAtUtc,
        };

        await refreshTokensRepository.AddAsync(refreshToken, cancellationToken);
        await refreshTokensRepository.SaveChangesAsync(cancellationToken);

        return new AuthResponse(
            accessToken,
            refreshTokenValue,
            expiresAtUtc,
            new UserDto(
                user.Id,
                user.Username,
                user.Email,
                user.Role,
                user.Status,
                user.CreatedAtUtc));
    }

    private static void ValidateRegisterRequest(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
            throw new InvalidOperationException("Username is required.");

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new InvalidOperationException("Email is required.");

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new InvalidOperationException("Password is required.");
    }
}