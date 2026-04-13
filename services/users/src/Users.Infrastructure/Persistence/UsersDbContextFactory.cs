using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Users.Infrastructure.Persistence;

public sealed class UsersDbContextFactory : IDesignTimeDbContextFactory<UsersDbContext>
{
    public UsersDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("ConnectionStrings__UsersDb")
            ?? Environment.GetEnvironmentVariable("SQLCONNSTR_UsersDb")
            ?? "Host=localhost;Port=5432;Database=users_db;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<UsersDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new UsersDbContext(optionsBuilder.Options);
    }
}