namespace Shared.Contracts.Events;

public sealed record GameCreatedEvent(
    Guid Id,
    string Title,
    string Slug,
    IReadOnlyCollection<string> Tags);