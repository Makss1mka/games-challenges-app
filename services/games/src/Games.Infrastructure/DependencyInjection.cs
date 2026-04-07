using Games.Application.Abstractions;
using Games.Application.Services;
using Games.Infrastructure.Persistence;
using Games.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Games.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddGamesModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("GamesDb")
            ?? configuration["SQLCONNSTR_GamesDb"]
            ?? throw new InvalidOperationException(
                "Games database connection string is missing. Set ConnectionStrings__GamesDb or SQLCONNSTR_GamesDb.");

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        services.AddDbContext<GamesDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IGamesRepository, GamesRepository>();
        services.AddScoped<ILibraryRepository, LibraryRepository>();
        services.AddScoped<ITagsRepository, TagsRepository>();

        services.AddScoped<GameService>();
        services.AddScoped<LibraryService>();

        return services;
    }
}