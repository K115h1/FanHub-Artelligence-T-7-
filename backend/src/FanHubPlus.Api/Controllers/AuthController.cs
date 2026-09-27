// Auth endpoints: register, login, profile, password change and reset.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanHubPlus.Api.Controllers;

public class AuthController : ApiControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public Task<IActionResult> Register(RegisterRequest request) =>
        Guarded(async () => Ok(await _auth.RegisterAsync(request, HttpContext.RequestAborted)));

    [HttpPost("login")]
    [AllowAnonymous]
    public Task<IActionResult> Login(LoginRequest request) =>
        Guarded(async () => Ok(await _auth.LoginAsync(request, HttpContext.RequestAborted)));

    [HttpGet("me")]
    [Authorize]
    public Task<IActionResult> Me() =>
        Guarded(async () => Ok(await _auth.GetProfileAsync(RequireUserId(), HttpContext.RequestAborted)));

    [HttpPut("me")]
    [Authorize]
    public Task<IActionResult> UpdateProfile(UpdateProfileRequest request) =>
        Guarded(async () => Ok(await _auth.UpdateProfileAsync(RequireUserId(), request, HttpContext.RequestAborted)));

    [HttpPost("change-password")]
    [Authorize]
    public Task<IActionResult> ChangePassword(ChangePasswordRequest request) =>
        Guarded(async () =>
        {
            await _auth.ChangePasswordAsync(RequireUserId(), request, HttpContext.RequestAborted);
            return NoContent();
        });

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public Task<IActionResult> ForgotPassword(ForgotPasswordRequest request) =>
        Guarded(async () =>
        {
            // Returns the token so the flow can be shown without a mail server.
            // A real deployment would email it and return 202 with no body.
            var token = await _auth.RequestPasswordResetAsync(request.Email, HttpContext.RequestAborted);
            return Ok(new { token, delivered = false });
        });

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public Task<IActionResult> ResetPassword(ResetPasswordRequest request) =>
        Guarded(async () =>
        {
            await _auth.ResetPasswordAsync(request, HttpContext.RequestAborted);
            return NoContent();
        });
}
