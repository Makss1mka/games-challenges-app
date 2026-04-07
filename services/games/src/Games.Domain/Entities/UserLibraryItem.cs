using Games.Domain.Enums;

namespace Games.Domain.Entities;

public sealed class UserLibraryItem
{
    public Guid UserId { get; set; }

    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;

    public LibrarySource Source { get; set; }
    public LibraryStatus Status { get; set; }
    public DateTimeOffset AddedAtUtc { get; set; }
}