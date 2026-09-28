// Unit tests for the enum <-> string conversion shared by the database columns
// and the JSON API.
//
// This exists because the failure is silent. Enum.TryParse with ignoreCase
// matches "CharacterProfile" to "characterprofile" but NOT to
// "character_profile", so a filter reading the stored word back found nothing
// and returned the whole table instead. Nothing errored; the list was just
// wrong. The other half is the reverse: serialising "Pending" where the client
// spells its filter "pending" makes every count read zero.
using FanHubPlus.Domain;
using FanHubPlus.Infrastructure;
using Xunit;

namespace FanHubPlus.UnitTests;

public class EnumConversionTests
{
    [Theory]
    // The form the database column stores and the API sends.
    [InlineData("character_profile", SubmissionKind.CharacterProfile)]
    [InlineData("event_highlight", SubmissionKind.EventHighlight)]
    [InlineData("article", SubmissionKind.Article)]
    // The enum member name, because a hand-typed query string often is.
    [InlineData("CharacterProfile", SubmissionKind.CharacterProfile)]
    // Casing, and surrounding whitespace from a pasted value.
    [InlineData("CHARACTER_PROFILE", SubmissionKind.CharacterProfile)]
    [InlineData("  article  ", SubmissionKind.Article)]
    public void TryParse_reads_the_stored_snake_case(string text, SubmissionKind expected)
    {
        Assert.True(EnumConverter.TryParse<SubmissionKind>(text, out var parsed));
        Assert.Equal(expected, parsed);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    // "fanart" was a real request: a plausible word for this table that the
    // SRS does not list, so it has to be rejected rather than defaulted.
    [InlineData("fanart")]
    [InlineData("not_a_kind")]
    public void TryParse_rejects_anything_unrecognised(string? text)
    {
        Assert.False(EnumConverter.TryParse<SubmissionKind>(text, out _));
    }

    [Theory]
    [InlineData(SubmissionKind.CharacterProfile, "character_profile")]
    [InlineData(SubmissionKind.EventHighlight, "event_highlight")]
    [InlineData(SubmissionKind.Article, "article")]
    [InlineData(SubmissionStatus.Pending, "pending")]
    [InlineData(SubmissionStatus.Approved, "approved")]
    [InlineData(SubmissionStatus.Rejected, "rejected")]
    public void ToWireString_writes_the_stored_form<TEnum>(TEnum value, string expected)
        where TEnum : struct, Enum
    {
        Assert.Equal(expected, EnumConverter.ToWireString(value));
    }

    [Fact]
    public void A_value_survives_a_round_trip()
    {
        // The property that actually matters: whatever the database stores, the
        // API sends, and the client sends back all name the same thing.
        foreach (var kind in Enum.GetValues<SubmissionKind>())
        {
            var wire = EnumConverter.ToWireString(kind);
            Assert.True(EnumConverter.TryParse<SubmissionKind>(wire, out var back), wire);
            Assert.Equal(kind, back);
        }

        foreach (var status in Enum.GetValues<SubmissionStatus>())
        {
            var wire = EnumConverter.ToWireString(status);
            Assert.True(EnumConverter.TryParse<SubmissionStatus>(wire, out var back), wire);
            Assert.Equal(status, back);
        }
    }
}
