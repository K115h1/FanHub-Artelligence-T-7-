// DI registration for the data layer. Called once from Program.cs.
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;
// ServerType, for the explicit ServerVersion.Create below.
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

namespace FanHubPlus.Infrastructure;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var connectionString = ResolveConnectionString(config);

        services.AddDbContext<AppDbContext>(options =>
        {
            // The server version is declared, not detected. AutoDetect opens a
            // connection while the DbContext is being configured, so on a platform
            // where the database is a separate container that is still booting —
            // Render, where MySQL and the API start independently — the first
            // request fails and the health check takes the API down before MySQL
            // has finished its first-boot schema import.
            //
            // Declaring 8.0 is also simply correct here: the schema uses ENUM,
            // utf8mb4 and generated columns, and there is no reason for the
            // provider to spend a round trip confirming what we already know.
            var version = ServerVersion.Create(8, 0, 36, ServerType.MySql);

            options.UseMySql(connectionString, version, mysql =>
                // MySQL closes idle connections on its side; without retrying, a
                // long-idle API instance throws on the first request after a lull
                // instead of reconnecting.
                mysql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null));
        });

        services.AddScoped<IContentRepository, ContentRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICommunityRepository, CommunityRepository>();

        return services;
    }

    /// <summary>
    /// The connection string, from whichever source is configured.
    ///
    /// A single ConnectionStrings:FanhubPlus value wins, so local development
    /// and the existing docs are unaffected. Otherwise it is assembled from the
    /// discrete DB_* variables, which is what a hosting platform's secret store
    /// wants: a password with a semicolon or an at-sign in it would otherwise
    /// need escaping inside a connection-string URL, and Render's
    /// fromService reference hands over one value at a time.
    /// </summary>
    private static string ResolveConnectionString(IConfiguration config)
    {
        var direct = config.GetConnectionString("FanhubPlus");
        if (!string.IsNullOrWhiteSpace(direct)) return direct;

        var host = config["DB_HOST"];
        var name = config["DB_NAME"];
        var user = config["DB_USER"];
        var password = config["DB_PASSWORD"];

        if (new[] { host, name, user, password }.Any(string.IsNullOrWhiteSpace))
        {
            throw new InvalidOperationException(
                "No database configured. Set ConnectionStrings:FanhubPlus, or all four of " +
                "DB_HOST, DB_NAME, DB_USER and DB_PASSWORD. Locally these go in " +
                "`dotnet user-secrets`; on a host they are environment variables.");
        }

        return $"Server={host};Port={config["DB_PORT"] ?? "3306"};" +
               $"Database={name};User={user};Password={password};" +
               "TreatTinyAsBoolean=true;AllowUserVariables=true;" +
               // Without this the provider opens a second connection to probe the
               // charset, which a connection-limited database will refuse.
               "ConnectionTimeout=15;DefaultCommandTimeout=30";
    }
}
