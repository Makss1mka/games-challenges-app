using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Users.Application.Abstractions;
using Users.Application.Services;
using Users.Infrastructure.Persistence;
using Users.Infrastructure.Repositories;
using Users.Infrastructure.Security;

namespace Users.Infrastructure;

/// <summary>DI registration for Users infrastructure and application services.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddUsersModule(this IServiceCollection services, IConfiguration cfg)
    {
        services.AddDbContext<UsersDbContext>(o =>
            o.UseNpgsql(cfg.GetConnectionString("UsersDb")));

        services.Configure<JwtOptions>(cfg.GetSection("Jwt"));

        services.AddScoped<IUsersRepository, UsersRepository>();
        services.AddScoped<IRefreshTokensRepository, RefreshTokensRepository>();

        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<IRefreshTokenGenerator, RefreshTokenGenerator>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();

        services.AddScoped<AuthService>();

        return services;
    }
}
