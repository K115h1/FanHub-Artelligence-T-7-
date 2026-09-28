// AvatarUpload — validates and stores a member's avatar image.
//
// The client already rejects a wrong type or an oversized file in
// src/services/upload.service.ts, but that check is a convenience, not a
// control: the browser can be skipped entirely. Everything is re-checked here.
//
// Storage is the filesystem under the API's wwwroot, and the stored value is a
// public path ("/images/avatars/<file>"). The name is generated rather than
// taken from the upload, so a caller cannot choose the path it writes to or
// collide with another member's file.
using System.Security.Cryptography;

namespace FanHubPlus.Api.Services;

public static class AvatarUpload
{
    /// 2 MB. Matches MAX_UPLOAD_BYTES in the frontend's upload.service.ts.
    public const long MaxBytes = 2 * 1024 * 1024;

    /// The only formats accepted. A magic-byte check follows, because the
    /// browser-supplied content type is a claim, not a fact.
    private static readonly string[] AllowedTypes = ["image/jpeg", "image/png", "image/webp"];

    // Named AvatarDirectory, not Directory: a member called `Directory` here
    // shadows System.IO.Directory for the whole file, which breaks
    // Directory.CreateDirectory further down.
    private const string AvatarDirectory = "images/avatars";

    /// <summary>
    /// Saves the upload and returns the public path to store on the user.
    /// Returns an error message instead of throwing, so the controller can turn
    /// it into a 400 with wording a member can act on.
    /// </summary>
    /// <param name="webRootPath">
    /// Supplied by the caller rather than guessed from the environment, so it is
    /// necessarily the same root UseStaticFiles serves. Guessing it here is how
    /// every avatar ends up written somewhere the web never looks.
    /// </param>
    public static async Task<(string? AvatarPath, string? Error)> SaveAsync(
        IFormFile? file, string webRootPath, CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return (null, "Choose an image to upload.");

        if (file.Length > MaxBytes)
            return (null, $"Images must be under {MaxBytes / 1024 / 1024}MB.");

        if (!AllowedTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            return (null, "Avatars must be a JPG, PNG or WebP image.");

        await using var stream = file.OpenReadStream();
        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, ct);

        var bytes = buffer.ToArray();
        if (!HasExpectedMagic(bytes, file.ContentType))
            return (null, "That file is not a valid image.");

        // Generated name: never the uploaded filename. A caller-supplied name is
        // a path-traversal risk and can overwrite another member's avatar.
        var extension = file.ContentType.ToLowerInvariant() switch
        {
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => ".jpg",
        };
        var name = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant() + extension;

        var dir = Path.Combine(webRootPath, "images", "avatars");
        System.IO.Directory.CreateDirectory(dir);

        await File.WriteAllBytesAsync(Path.Combine(dir, name), bytes, ct);

        return ($"/{AvatarDirectory}/{name}", null);
    }

    /// <summary>
    /// Confirms the bytes really are the format the content type claims.
    /// Covers the case where a caller sends a script or an HTML file labelled
    /// image/png, which would otherwise be written to a path the web server
    /// serves back.
    /// </summary>
    private static bool HasExpectedMagic(byte[] bytes, string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/jpeg" => bytes.Length > 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
        "image/png" => bytes.Length > 8
            && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
            && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A,
        "image/webp" => bytes.Length > 12
            && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
            && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50,
        _ => false,
    };
}
