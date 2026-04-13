namespace Games.Domain.Entities;

public sealed class Tag
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;

    public ICollection<GameTag> GameTags { get; set; } = new List<GameTag>();
}