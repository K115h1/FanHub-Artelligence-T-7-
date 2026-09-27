// DI registration for the data layer. Called once from Program.cs.
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FanHubPlus.Infrastructure;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // The connection string comes from user-secrets or the environment, never
        // from a committed appsettings file.
        var connectionString = config.GetConnectionString("FanhubPlus")
            ?? throw new InvalidOperationException(
                "ConnectionStrings:FanhubPlus is not set. Add it to user-secrets or the environment.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

        services.AddScoped<IContentRepository, ContentRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICommunityRepository, CommunityRepository>();

        return services;
    }
}
