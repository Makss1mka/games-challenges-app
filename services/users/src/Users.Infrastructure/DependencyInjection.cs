using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Users.Application.Abstractions;
using Users.Application.Services;
using Users.Infrastructure.Persistence;
using Users.Infrastructure.Repositories;
using Users.Infrastructure.Security;

namespace Users.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddUsersModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("UsersDb")
            ?? configuration["SQLCONNSTR_UsersDb"]
            ?? throw new InvalidOperationException(
                "Users database connection string is missing. Set ConnectionStrings__UsersDb or SQLCONNSTR_UsersDb.");

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        services.AddDbContext<UsersDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IUsersRepository, UsersRepository>();
        services.AddScoped<IRefreshTokensRepository, RefreshTokensRepository>();
        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IRefreshTokenGenerator, RefreshTokenGenerator>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        services.AddScoped<AuthService>();
        services.AddScoped<UsersService>();

        return services;
    }
}