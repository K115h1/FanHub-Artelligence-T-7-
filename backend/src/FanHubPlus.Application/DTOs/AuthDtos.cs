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

/// A category the member has picked, with enough to render a chip without a
/// second round trip. Slug is what the frontend routes on.
public record CategoryChipDto(byte Id, string Slug, string Name);

/// Both category lists in one response, so the profile screen makes a single
/// request on open rather than one per list.
public record ProfileCategoriesDto(
    IReadOnlyList<CategoryChipDto> Favorites,
    IReadOnlyList<CategoryChipDto> Interests);

/// Replaces one of the two lists wholesale.
public record SetCategoriesRequest(IReadOnlyList<byte> CategoryIds);

public record AvatarDto(string? AvatarPath);

public record SendVerificationRequest(string Email);

public record ConfirmVerificationRequest(string Token);

/// One row of a member's activity feed.
///
/// `Action` and `TargetId` are what the log stores; the human wording is
/// resolved by the frontend, because the same action reads differently
/// depending on the member's locale and the copy should live with the UI. A
/// `label` field here would put English strings in the API for one client.
public record ActivityDto(
    uint LogId,
    string Action,
    uint? TargetId,
    DateTime CreatedAt);
