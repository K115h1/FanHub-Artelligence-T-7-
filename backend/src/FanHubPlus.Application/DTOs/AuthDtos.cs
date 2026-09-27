// DTOs for auth and the current user. Records, so they are immutable by default.
//
// Nothing here is a database entity: the Application layer maps User -> UserDto
// so controllers never hand out password hashes or internal ids it should not.
namespace FanHubPlus.Application.DTOs;

public record RegisterRequest(
    string Name,
    string Email,
    string Password);

public record LoginRequest(
    string Email,
    string Password);

public record UserDto(
    uint Id,
    string Name,
    string Email,
    string? AvatarPath,
    string? Bio,
    bool IsVerified,
    string Role,
    DateTime CreatedAt);

public record AuthResponse(
    string Token,
    DateTime ExpiresAt,
    UserDto User);

public record UpdateProfileRequest(
    string? Name,
    string? Bio);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Token, string NewPassword);
