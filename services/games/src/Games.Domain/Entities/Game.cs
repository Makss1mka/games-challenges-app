namespace Games.Domain.Entities;

public sealed class Game
{
    public Guid Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? Description { get; set; }
    public string? Developer { get; set; }
    public string? Publisher { get; set; }
    public DateOnly? ReleaseDate { get; set; }

    public ICollection<GameTag> GameTags { get; set; } = new List<GameTag>();
    public ICollection<UserLibraryItem> LibraryItems { get; set; } = new List<UserLibraryItem>();
}