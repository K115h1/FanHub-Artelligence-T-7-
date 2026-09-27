// A Fact that skips itself when no test database is configured, so
// `dotnet test` still passes on a machine that has no MySQL set up.
//
// The connection string comes from user-secrets, which a static attribute
// constructor cannot read cheaply, so this keys off an environment variable
// instead. Set it to the same value as the API's connection string:
//
//   $env:FANHUBPLUS_TEST_DB = "Server=127.0.0.1;Port=3306;Database=fanhubplus;User=root;Password=..."
//   dotnet test tests/FanHubPlus.IntegrationTests
using Xunit;

namespace FanHubPlus.IntegrationTests;

/// <summary>Name of the environment variable holding the test connection string.</summary>
public static class TestDatabase
{
    public const string EnvVar = "FANHUBPLUS_TEST_DB";

    public static string? ConnectionString =>
        Environment.GetEnvironmentVariable(EnvVar) is { Length: > 0 } value ? value : null;

    public static bool IsConfigured => ConnectionString is not null;
}

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class DatabaseFactAttribute : FactAttribute
{
    public DatabaseFactAttribute()
    {
        if (!TestDatabase.IsConfigured)
        {
            Skip = $"Set {TestDatabase.EnvVar} to a MySQL connection string to run this test.";
        }
    }
}
