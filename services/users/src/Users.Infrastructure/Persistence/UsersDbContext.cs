using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Reflection.Emit;
using Users.Domain.Entities;

namespace Users.Infrastructure.Persistence;

/// <summary>EF Core DbContext for Users service.</summary>
public sealed class UsersDbContext : DbContext
{
    public UsersDbContext(DbContextOptions<UsersDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasDefaultSchema("users");

        b.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).IsRequired().HasMaxLength(320);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Username).HasMaxLength(32);
            e.HasIndex(x => x.Username).IsUnique().HasFilter("\"username\" IS NOT NULL");
            e.Property(x => x.PasswordHash).IsRequired();
            e.Property(x => x.Role).HasConversion<short>();
            e.Property(x => x.Status).HasConversion<short>();
            e.Property(x => x.CreatedAt).IsRequired();
            e.Property(x => x.UpdatedAt).IsRequired();
        });

        b.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.ExpiresAt);
            e.Property(x => x.TokenHash).IsRequired();
            e.Property(x => x.CreatedAt).IsRequired();
            e.Property(x => x.ExpiresAt).IsRequired();
        });
    }
}
