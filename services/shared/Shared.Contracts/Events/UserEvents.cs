namespace Shared.Contracts.Events;

public sealed record UserRegistered(Guid UserId, string Email, DateTimeOffset OccurredAt);

public sealed record UserStatusChanged(Guid UserId, short Status, DateTimeOffset OccurredAt);
