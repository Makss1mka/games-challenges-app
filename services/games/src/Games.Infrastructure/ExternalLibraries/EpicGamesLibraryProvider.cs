using Games.Application.Abstractions;
using Games.Application.Models;
using Games.Domain.Enums;

namespace Games.Infrastructure.ExternalLibraries;

public sealed class EpicGamesLibraryProvider : IExternalLibraryProvider
{
    public LibrarySource Source => LibrarySource.EpicGames;

    public Task<ExternalLibrarySnapshot> LoadLibraryAsync(
        ExternalLibraryImportContext context,
        CancellationToken cancellationToken = default)
    {
        throw new NotSupportedException(
            "Epic Games import is not available yet. Epic does not provide a public server-side API in this project for reading a user's game library by profile.");
    }
}
