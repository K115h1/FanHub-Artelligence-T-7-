// Generates an Argon2id password hash in the exact format AuthService expects,
// so the demo accounts in database/05_reference_data.sql can be seeded with
// hashes the API will actually verify.
//
// Usage:
//   dotnet run --project src/FanHubPlus.Api -- --hash-password hunter2
//   dotnet run --project src/FanHubPlus.Api -- --hash-password hunter2 --user "Ada Lovelace"
//
// A hash is salted per user, so generate one per account rather than reusing
// a single value for both demo users.
using FanHubPlus.Domain;
using Microsoft.AspNetCore.Identity;

namespace FanHubPlus.Api;

public static class HashPassword
{
    /// Returns true when it printed a hash, meaning the host should exit
    /// without starting the web server.
    public static bool TryRun(string[] args)
    {
        var index = Array.IndexOf(args, "--hash-password");
        if (index < 0) return false;

        if (index + 1 >= args.Length)
        {
            Console.WriteLine("--hash-password needs a value.");
            return true;
        }

        var password = args[index + 1];

        // Defaults to the demo account name so a hash can be pasted straight
        // into the seed file.
        var nameIndex = Array.IndexOf(args, "--user");
        var userName = nameIndex >= 0 && nameIndex + 1 < args.Length
            ? args[nameIndex + 1]
            : "Ada Lovelace";

        var user = new User { UserId = 1, Name = userName, Email = "seed@example.test" };
        var hasher = new PasswordHasher<User>();

        Console.WriteLine();
        Console.WriteLine($"  user : {userName}");
        Console.WriteLine($"  hash : {hasher.HashPassword(user, password)}");
        Console.WriteLine();
        Console.WriteLine("Paste it into the commented-out INSERT in");
        Console.WriteLine("database/05_reference_data.sql, then uncomment that INSERT.");

        return true;
    }
}
