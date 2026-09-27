// Integration tests. These need a live MySQL database with the schema loaded,
// so they are skipped automatically when no connection string is configured —
// otherwise `dotnet test` would fail on a machine that has no database set up.
//
// To run them:
//   dotnet user-secrets set "ConnectionStrings:FanhubPlus" \
//     "Server=127.0.0.1;Port=3306;Database=fanhubplus;User=root;Password=..."
//   dotnet test tests/FanHubPlus.IntegrationTests
using FanHubPlus.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace FanHubPlus.IntegrationTests;

public class RepositoryTests : IAsyncLifetime
{
    private const string ConnKey = "ConnectionStrings:FanhubPlus";

    private AppDbContext? _db;
    private bool _available;
    private string _unavailableReason = string.Empty;

    public async Task InitializeAsync()
    {
        // The env var first, because that is what DatabaseFactAttribute checks —
        // reading user-secrets here instead would mean the attribute skips while
        // this method finds nothing, or the reverse. user-secrets stays as a
        // fallback so a developer who already configured the API needs nothing else.
        var connectionString = TestDatabase.ConnectionString
            ?? new ConfigurationBuilder().AddUserSecrets<RepositoryTests>().Build()[ConnKey];

        if (string.IsNullOrWhiteSpace(connectionString)) return;

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql(connectionString, ServerVersion.AutoDetect(connectionString))
            .Options;

        _db = new AppDbContext(options);

        // Probe rather than assume, and keep the reason: "could not be reached"
        // is useless if the real problem was a bad password.
        try
        {
            _available = await _db.Database.CanConnectAsync();
            if (!_available) _unavailableReason = "CanConnectAsync returned false.";
        }
        catch (Exception ex)
        {
            _unavailableReason = ex.Message;
        }
    }

    public Task DisposeAsync()
    {
        _db?.Dispose();
        return Task.CompletedTask;
    }

    private void RequireDatabase()
    {
        // DatabaseFactAttribute already skipped the test when nothing is
        // configured, so reaching here means the server was unreachable.
        Assert.True(_available && _db is not null,
            $"The database is configured but could not be reached. {_unavailableReason}");
    }

    [DatabaseFact]
    public async Task The_catalogue_is_loaded()
    {
        RequireDatabase();

        var count = await _db!.Contents.CountAsync();

        // The five imports load 2,490 titles. A zero here means the 04_*_seed.sql
        // files were never loaded, which is the most likely setup mistake.
        Assert.True(count > 0, "The contents table is empty — load the 04_*_seed.sql files.");
    }

    [DatabaseFact]
    public async Task Roles_are_seeded()
    {
        RequireDatabase();

        // Registration inserts a user_roles row, which is a foreign key onto
        // this table. An empty roles table is why registration fails on a
        // database that has only had the 04_* files loaded.
        var names = await _db!.Roles.Select(r => r.Name).ToListAsync();

        Assert.Contains("registered", names);
        Assert.Contains("admin", names);
    }

    [DatabaseFact]
    public async Task All_eight_categories_are_present()
    {
        RequireDatabase();

        var slugs = await _db!.Categories.Select(c => c.Slug).ToListAsync();

        // The frontend's sidebar links to all eight, so a missing one is a
        // 404 waiting to happen.
        foreach (var expected in new[] { "movies", "anime", "gaming", "comics", "k-pop", "tv-shows", "manga", "cosplay" })
        {
            Assert.Contains(expected, slugs);
        }
    }

    [DatabaseFact]
    public async Task Content_slugs_are_unique_within_a_category()
    {
        RequireDatabase();

        // "Akira" exists in both Anime and Comics and "Icarus" in both Gaming
        // and Movies, so uniqueness is per category, matching the schema's
        // uq_contents_category_slug index.
        var duplicates = await _db!.Contents
            .GroupBy(c => new { c.CategoryId, c.Slug })
            .Where(g => g.Count() > 1)
            .Select(g => g.Key.Slug)
            .ToListAsync();

        Assert.Empty(duplicates);
    }

    [DatabaseFact]
    public async Task Content_count_matches_the_genre_links()
    {
        RequireDatabase();

        // Every genre link must point at a content row that exists. A mismatch
        // means a seed file loaded out of order.
        var orphaned = await _db!.Database
            .SqlQueryRaw<int>("SELECT COUNT(*) FROM content_genres cg LEFT JOIN contents c ON c.content_id = cg.content_id WHERE c.content_id IS NULL")
            .ToListAsync();

        Assert.Equal(0, orphaned[0]);
    }
}
