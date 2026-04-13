using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Games.Infrastructure.Persistence;

public sealed class GamesDbContextFactory : IDesignTimeDbContextFactory<GamesDbContext>
{
    public GamesDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("ConnectionStrings__GamesDb")
            ?? Environment.GetEnvironmentVariable("SQLCONNSTR_GamesDb")
            ?? "Host=localhost;Port=5432;Database=games_db;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<GamesDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new GamesDbContext(optionsBuilder.Options);
    }
}