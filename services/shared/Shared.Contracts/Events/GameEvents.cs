namespace Shared.Contracts.Events;

/// <summary>Event raised when a game is created in catalog.</summary>
public sealed record GameCreated(Guid GameId, string Title, DateTimeOffset OccurredAt);

/// <summary>Event raised when user adds a game to their library.</summary>
public sealed record LibraryGameAdded(Guid UserId, Guid GameId, DateTimeOffset OccurredAt);

/// <summary>Event raised when user removes a game from their library.</summary>
public sealed record LibraryGameRemoved(Guid UserId, Guid GameId, DateTimeOffset OccurredAt);

/// <summary>Event raised when user updates game status in their library.</summary>
public sealed record LibraryGameUpdated(Guid UserId, Guid GameId, short Status, DateTimeOffset OccurredAt);
