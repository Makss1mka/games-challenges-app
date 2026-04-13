using Games.Domain.Enums;

namespace Games.Application.Models;

public sealed record ImportSteamLibraryRequest(
    string ProfileId,
    bool IncludePlayedFreeGames = true,
    LibraryStatus ImportedGamesStatus = LibraryStatus.Backlog);

public sealed record ImportEpicGamesLibraryRequest(
    string AccountId,
    LibraryStatus ImportedGamesStatus = LibraryStatus.Backlog);

public sealed record ExternalLibraryImportContext(
    string ProfileId,
    bool IncludePlayedFreeGames = true);

public sealed record ExternalOwnedGame(
    string ExternalGameId,
    string Title,
    string? Description = null,
    string? Developer = null,
    string? Publisher = null,
    DateOnly? ReleaseDate = null,
    string? ImageUrl = null,
    IReadOnlyCollection<string>? Tags = null);

public sealed record ExternalLibrarySnapshot(
    string RequestedProfileId,
    string ResolvedProfileId,
    string? DisplayName,
    IReadOnlyCollection<ExternalOwnedGame> Games);

public sealed record ImportedLibraryGameDto(
    Guid GameId,
    string Title,
    string Slug,
    string ExternalGameId,
    bool AddedToLibrary);

public sealed record ExternalLibraryImportResultDto(
    string Provider,
    string RequestedProfileId,
    string ResolvedProfileId,
    string? DisplayName,
    int ImportedGamesCount,
    int AddedToLibraryCount,
    int AlreadyInLibraryCount,
    IReadOnlyCollection<ImportedLibraryGameDto> Games);
