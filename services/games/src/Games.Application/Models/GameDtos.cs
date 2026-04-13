using Games.Domain.Enums;

namespace Games.Application.Models;

public sealed record TagDto(Guid Id, string Name);

public sealed record GameDto(
    Guid Id,
    string Title,
    string Slug,
    string? Description,
    string? Developer,
    string? Publisher,
    DateOnly? ReleaseDate,
    string? ImageUrl,
    IReadOnlyCollection<string> Tags);

public sealed record CreateGameRequest(
    string Title,
    string Slug,
    string? Description,
    string? Developer,
    string? Publisher,
    DateOnly? ReleaseDate,
    string? ImageUrl,
    IReadOnlyCollection<string>? Tags);

public sealed record UpdateGameRequest(
    string? Title,
    string? Slug,
    string? Description,
    string? Developer,
    string? Publisher,
    DateOnly? ReleaseDate,
    string? ImageUrl,
    IReadOnlyCollection<string>? Tags);

public sealed record AddLibraryItemRequest(
    Guid GameId,
    LibrarySource Source,
    LibraryStatus Status);

public sealed record LibraryItemDto(
    Guid UserId,
    Guid GameId,
    string GameTitle,
    string GameSlug,
    LibrarySource Source,
    LibraryStatus Status,
    DateTimeOffset AddedAtUtc);
