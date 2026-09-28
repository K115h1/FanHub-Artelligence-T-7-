// Stores enums as the snake_case words the MySQL ENUM columns already use.
//
// The default string conversion writes the C# member name verbatim, so
// ContentType.MusicArtist would be written as "MusicArtist" and fail to convert
// back on read — the column holds 'music_artist'. This maps in both directions.
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace FanHubPlus.Infrastructure;

/// <summary>
/// Maps enum members to and from the snake_case words the MySQL ENUM columns and
/// the JSON API use. Public so the Application and Api layers can parse an
/// incoming string with the same rules EF uses when reading a row.
/// </summary>
public static class EnumConverter
{
    public static ValueConverter<TEnum, string> SnakeCase<TEnum>() where TEnum : struct, Enum =>
        new(
            value => ToSnakeCase(value.ToString()!),
            text => Parse<TEnum>(text));

    /// <summary>
    /// Parses the snake_case word the database and the API use
    /// ('character_profile', 'music_artist') into the enum member
    /// (CharacterProfile, MusicArtist).
    /// </summary>
    /// <remarks>
    /// Enum.TryParse with ignoreCase handles casing but not the underscore, so
    /// "character_profile" does NOT match CharacterProfile and a query filter
    /// silently returns everything instead of nothing. This is the one parser
    /// for both directions, so a value that round-trips through the database
    /// always round-trips back.
    /// </remarks>
    public static bool TryParse<TEnum>(string? text, out TEnum value) where TEnum : struct, Enum
    {
        value = default;
        if (string.IsNullOrWhiteSpace(text)) return false;

        if (Enum.TryParse<TEnum>(ToPascalCase(text.Trim()), ignoreCase: true, out var parsed))
        {
            value = parsed;
            return true;
        }

        return false;
    }

    /// <summary>
    /// The value to put on the wire: the same snake_case word the database
    /// column stores, e.g. "pending" and "character_profile".
    /// </summary>
    /// <remarks>
    /// Not a stylistic choice. The frontend keeps its filters and status lists in
    /// lowercase, so serialising "Pending" instead of "pending" makes every count
    /// read zero and every status comparison silently fail. Sending the stored
    /// form means the wire format and the column always agree.
    /// </remarks>
    public static string ToWireString<TEnum>(TEnum value) where TEnum : struct, Enum =>
        ToSnakeCase(value.ToString()!);

    private static TEnum Parse<TEnum>(string text) where TEnum : struct, Enum =>
        TryParse<TEnum>(text, out var value) ? value : default;

    private static string ToSnakeCase(string name)
    {
        var sb = new System.Text.StringBuilder(name.Length + 4);

        for (var i = 0; i < name.Length; i++)
        {
            var ch = name[i];

            // A capital after a lowercase starts a new word: MusicArtist.
            if (i > 0 && char.IsUpper(ch) && !char.IsUpper(name[i - 1]))
                sb.Append('_');

            sb.Append(char.ToLowerInvariant(ch));
        }

        return sb.ToString();
    }

    private static string ToPascalCase(string text)
    {
        var parts = text.Split('_', StringSplitOptions.RemoveEmptyEntries);
        var sb = new System.Text.StringBuilder(text.Length);

        foreach (var part in parts)
        {
            sb.Append(char.ToUpperInvariant(part[0]));
            if (part.Length > 1)
                sb.Append(part[1..].ToLowerInvariant());
        }

        return sb.ToString();
    }
}
