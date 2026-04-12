using Games.Application.Models;
using Games.Domain.Enums;

namespace Games.Application.Abstractions;

public interface IExternalLibraryProvider
{
    LibrarySource Source { get; }

    Task<ExternalLibrarySnapshot> LoadLibraryAsync(
        ExternalLibraryImportContext context,
        CancellationToken cancellationToken = default);
}
