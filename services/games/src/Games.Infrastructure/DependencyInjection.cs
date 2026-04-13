using Games.Application.Abstractions;
using Games.Application.Services;
using Games.Infrastructure.ExternalLibraries;
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
        services.Configure<SteamImportOptions>(configuration.GetSection(SteamImportOptions.SectionName));

        services.AddDbContext<GamesDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddHttpClient<SteamLibraryProvider>(client =>
        {
            var baseUrl = configuration.GetSection(SteamImportOptions.SectionName)["BaseUrl"]
                ?? "https://partner.steam-api.com";
            client.BaseAddress = new Uri(baseUrl);
        });

        services.AddScoped<IGamesRepository, GamesRepository>();
        services.AddScoped<IGameExternalMappingsRepository, GameExternalMappingsRepository>();
        services.AddScoped<ILibraryRepository, LibraryRepository>();
        services.AddScoped<ITagsRepository, TagsRepository>();
        services.AddScoped<IExternalLibraryProvider>(serviceProvider =>
            serviceProvider.GetRequiredService<SteamLibraryProvider>());
        services.AddScoped<IExternalLibraryProvider, EpicGamesLibraryProvider>();

        services.AddScoped<GameService>();
        services.AddScoped<LibraryService>();

        return services;
    }
}
