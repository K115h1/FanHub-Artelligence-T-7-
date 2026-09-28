// Auth endpoints: register, login, profile, password change and reset.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Application.Services;
using FanHubPlus.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanHubPlus.Api.Controllers;

public class AuthController : ApiControllerBase
{
    private readonly IAuthService _auth;
    private readonly IWebHostEnvironment _env;

    public AuthController(IAuthService auth, IWebHostEnvironment env)
    {
        _auth = auth;
        _env = env;
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

    // ---------- Category lists ----------
    //
    // Favourites and interests are two separate lists, not one list with a
    // flag: favouriting is a deliberate pin, interests are a broader signal
    // used for recommendations, and un-favouriting something should not
    // silently change what gets recommended.

    [HttpGet("categories")]
    [Authorize]
    public Task<IActionResult> GetCategories() =>
        Guarded(async () =>
            Ok(await _auth.GetCategoriesAsync(RequireUserId(), HttpContext.RequestAborted)));

    [HttpPut("categories/favorites")]
    [Authorize]
    public Task<IActionResult> SetFavorites(SetCategoriesRequest request) =>
        Guarded(async () =>
            Ok(await _auth.SetFavoritesAsync(RequireUserId(), request, HttpContext.RequestAborted)));

    [HttpPut("categories/interests")]
    [Authorize]
    public Task<IActionResult> SetInterests(SetCategoriesRequest request) =>
        Guarded(async () =>
            Ok(await _auth.SetInterestsAsync(RequireUserId(), request, HttpContext.RequestAborted)));

    // ---------- Avatar ----------

    [HttpPost("avatar")]
    [Authorize]
    [RequestSizeLimit(AvatarUpload.MaxBytes)]
    public Task<IActionResult> UploadAvatar(IFormFile file) =>
        Guarded(async () =>
        {
            var (avatarPath, error) = await AvatarUpload.SaveAsync(
                file, _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), HttpContext.RequestAborted);
            if (error is not null) return BadRequest(new { message = error });

            await _auth.SetAvatarAsync(RequireUserId(), avatarPath, HttpContext.RequestAborted);
            return Ok(new { avatarPath });
        });

    [HttpDelete("avatar")]
    [Authorize]
    public Task<IActionResult> RemoveAvatar() =>
        Guarded(async () =>
        {
            await _auth.SetAvatarAsync(RequireUserId(), null, HttpContext.RequestAborted);
            return NoContent();
        });

    // ---------- Email verification ----------

    // ---------- Recent activity ----------

    /// GET /api/auth/activity?take=10
    [HttpGet("activity")]
    [Authorize]
    public Task<IActionResult> Activity([FromQuery] int take = 10) =>
        Guarded(async () =>
            Ok(await _auth.GetActivityAsync(RequireUserId(), take, HttpContext.RequestAborted)));

    [HttpPost("send-verification")]
    [AllowAnonymous]
    public Task<IActionResult> SendVerification(SendVerificationRequest request) =>
        Guarded(async () =>
        {
            // Returns the token so the flow is demonstrable without a mail
            // server, and the link is also written to the API log.
            var token = await _auth.RequestEmailVerificationAsync(request.Email, HttpContext.RequestAborted);
            return Ok(new { token, delivered = false });
        });

    [HttpPost("confirm-verification")]
    [AllowAnonymous]
    public Task<IActionResult> ConfirmVerification(ConfirmVerificationRequest request) =>
        Guarded(async () =>
        {
            await _auth.ConfirmEmailAsync(request, HttpContext.RequestAborted);
            return NoContent();
        });
}
