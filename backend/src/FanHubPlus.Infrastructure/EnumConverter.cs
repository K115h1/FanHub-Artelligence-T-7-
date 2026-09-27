// Stores enums as the snake_case words the MySQL ENUM columns already use.
//
// The default string conversion writes the C# member name verbatim, so
// ContentType.MusicArtist would be written as "MusicArtist" and fail to convert
// back on read — the column holds 'music_artist'. This maps in both directions.
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace FanHubPlus.Infrastructure;

internal static class EnumConverter
{
    public static ValueConverter<TEnum, string> SnakeCase<TEnum>() where TEnum : struct, Enum =>
        new(
            value => ToSnakeCase(value.ToString()!),
            // ignoreCase so a hand-edited row like 'Music_Artist' still reads.
            text => (TEnum)Enum.Parse(typeof(TEnum), ToPascalCase(text), ignoreCase: true));

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
