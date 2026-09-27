// DI registration for the business layer. Called once from Program.cs.
using FanHubPlus.Application.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace FanHubPlus.Application;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // The framework's hasher, not a hand-rolled one. It is an interface, so
        // services depend on IPasswordHasher<User> and tests can swap it.
        services.AddScoped<IPasswordHasher<FanHubPlus.Domain.User>, PasswordHasher<FanHubPlus.Domain.User>>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IContentService, ContentService>();
        services.AddScoped<ICommunityService, CommunityService>();
        services.AddScoped<IAdminService, AdminService>();

        return services;
    }
}
