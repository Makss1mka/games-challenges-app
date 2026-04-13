namespace Games.Domain.Entities;

public sealed class GameTag
{
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;

    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}