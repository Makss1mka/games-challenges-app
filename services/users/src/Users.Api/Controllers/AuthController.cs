using Microsoft.AspNetCore.Mvc;
using Users.Api.Security;
using Users.Application.Models;
using Users.Application.Services;

namespace Users.Api.Controllers;

/// <summary>Authentication endpoints (register/login/refresh/logout).</summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth) => _auth = auth;

    /// <summary>Registers user and returns access+refresh tokens.</summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req, CancellationToken ct)
    {
        var res = await _auth.RegisterAsync(req, ct);
        return Ok(res);
    }

    /// <summary>Logs user in and returns access+refresh tokens.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req, CancellationToken ct)
    {
        var res = await _auth.LoginAsync(req, ct);
        return Ok(res);
    }

    /// <summary>Rotates refresh token and returns new tokens.</summary>
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest req, CancellationToken ct)
    {
        var res = await _auth.RefreshAsync(req, ct);
        return Ok(res);
    }

    /// <summary>Logout from all sessions (revokes all refresh tokens).</summary>
    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutAll(CancellationToken ct)
    {
        var userId = User.GetUserId();
        await _auth.LogoutAllAsync(userId, ct);
        return NoContent();
    }
}
