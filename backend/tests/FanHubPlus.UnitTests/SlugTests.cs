// Unit tests for the business rules that do not need a database: input
// validation and slug generation. These are the rules most likely to be
// pointed at during a demo, so they are worth pinning down.
using FanHubPlus.Application.Services;
using Xunit;

namespace FanHubPlus.UnitTests;

public class SlugTests
{
    [Theory]
    [InlineData("Dune: Part Two", "dune-part-two")]
    [InlineData("Spider-Man: No Way Home", "spider-man-no-way-home")]
    // Accents are dropped rather than kept, so the slug stays URL-safe.
    [InlineData("Les Misérables", "les-miserables")]
    [InlineData("Amélie", "amelie")]
    [InlineData("  Princess Mononoke  ", "princess-mononoke")]
    [InlineData("Cowboy Bebop", "cowboy-bebop")]
    public void Slugify_produces_url_safe_slugs(string input, string expected)
    {
        Assert.Equal(expected, ContentService.Slugify(input));
    }

    [Fact]
    public void Slugify_collapses_repeated_separators()
    {
        Assert.Equal("a-b", ContentService.Slugify("a --- b"));
    }

    [Fact]
    public void Slugify_never_leaves_a_leading_or_trailing_dash()
    {
        Assert.Equal("hello", ContentService.Slugify("!!!hello!!!"));
    }
}
