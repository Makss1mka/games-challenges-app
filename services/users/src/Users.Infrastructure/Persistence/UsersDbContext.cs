using Microsoft.EntityFrameworkCore;
using Users.Domain.Entities;

namespace Users.Infrastructure.Persistence;

public sealed class UsersDbContext(DbContextOptions<UsersDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("users");

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Username).HasMaxLength(64).IsRequired();
            entity.Property(x => x.NormalizedUsername).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(256).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();

            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.NormalizedUsername).IsUnique();
            entity.HasIndex(x => x.Username);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Token).HasMaxLength(256).IsRequired();
            entity.HasIndex(x => x.Token).IsUnique();

            entity.HasOne(x => x.User)
                .WithMany(x => x.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}