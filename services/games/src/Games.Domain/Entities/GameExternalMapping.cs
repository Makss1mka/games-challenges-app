using Games.Domain.Enums;

namespace Games.Domain.Entities;

public sealed class GameExternalMapping
{
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;

    public LibrarySource Source { get; set; }
    public string ExternalGameId { get; set; } = null!;
    public string ExternalTitle { get; set; } = null!;
    public DateTimeOffset LastSyncedAtUtc { get; set; }
}
