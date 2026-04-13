namespace Shared.Contracts.Events;

public sealed record GameCreatedEvent(
    Guid Id,
    string Title,
    string Slug,
    IReadOnlyCollection<string> Tags);

public sealed record LibraryItemAddedEvent(
    Guid UserId,
    Guid GameId,
    string GameTitle,
    string GameSlug,
    string Source,
    string Status,
    DateTimeOffset AddedAtUtc);
