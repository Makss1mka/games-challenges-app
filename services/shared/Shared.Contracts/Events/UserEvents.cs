namespace Shared.Contracts.Events;

public sealed record UserRegisteredEvent(
    Guid Id,
    string Username,
    string Email);