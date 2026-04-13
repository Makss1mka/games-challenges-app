using Games.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Games.Infrastructure.Persistence;

public sealed class GamesDbContext(DbContextOptions<GamesDbContext> options) : DbContext(options)
{
    public DbSet<Game> Games => Set<Game>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<GameTag> GameTags => Set<GameTag>();
    public DbSet<GameExternalMapping> GameExternalMappings => Set<GameExternalMapping>();
    public DbSet<UserLibraryItem> UserLibraryItems => Set<UserLibraryItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("games");

        modelBuilder.Entity<Game>(entity =>
        {
            entity.ToTable("games");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Title).HasMaxLength(256).IsRequired();
            entity.Property(x => x.Slug).HasMaxLength(256).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(4000);
            entity.Property(x => x.Developer).HasMaxLength(256);
            entity.Property(x => x.Publisher).HasMaxLength(256);
            entity.Property(x => x.ImageUrl).HasMaxLength(1024);

            entity.HasIndex(x => x.Slug).IsUnique();
            entity.HasIndex(x => x.Title);
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.ToTable("tags");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name).HasMaxLength(128).IsRequired();
            entity.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<GameTag>(entity =>
        {
            entity.ToTable("game_tags");
            entity.HasKey(x => new { x.GameId, x.TagId });

            entity.HasOne(x => x.Game)
                .WithMany(x => x.GameTags)
                .HasForeignKey(x => x.GameId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Tag)
                .WithMany(x => x.GameTags)
                .HasForeignKey(x => x.TagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GameExternalMapping>(entity =>
        {
            entity.ToTable("game_external_mappings");
            entity.HasKey(x => new { x.Source, x.ExternalGameId });

            entity.Property(x => x.ExternalGameId).HasMaxLength(128).IsRequired();
            entity.Property(x => x.ExternalTitle).HasMaxLength(256).IsRequired();
            entity.Property(x => x.LastSyncedAtUtc).IsRequired();

            entity.HasOne(x => x.Game)
                .WithMany(x => x.ExternalMappings)
                .HasForeignKey(x => x.GameId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.GameId);
        });

        modelBuilder.Entity<UserLibraryItem>(entity =>
        {
            entity.ToTable("user_library_items");
            entity.HasKey(x => new { x.UserId, x.GameId });

            entity.Property(x => x.AddedAtUtc).IsRequired();

            entity.HasOne(x => x.Game)
                .WithMany(x => x.LibraryItems)
                .HasForeignKey(x => x.GameId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.Status);
        });
    }
}
