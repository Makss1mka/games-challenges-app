using System.Net;
using System.Net.Http.Json;
using Games.Application.Abstractions;
using Games.Application.Models;
using Games.Domain.Enums;
using Microsoft.Extensions.Options;
using Shared.BuildingBlocks.Exceptions;

namespace Games.Infrastructure.ExternalLibraries;

public sealed class SteamLibraryProvider(
    HttpClient httpClient,
    IOptions<SteamImportOptions> options) : IExternalLibraryProvider
{
    private readonly SteamImportOptions _options = options.Value;

    public LibrarySource Source => LibrarySource.Steam;

    public async Task<ExternalLibrarySnapshot> LoadLibraryAsync(
        ExternalLibraryImportContext context,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(context.ProfileId))
            throw new BadRequestException("Steam profile id is required.");

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
            throw new InvalidOperationException("Steam import is not configured. Set SteamImport__ApiKey.");

        var requestedProfileId = context.ProfileId.Trim();
        var steamId = await ResolveSteamIdAsync(requestedProfileId, cancellationToken);
        var response = await GetOwnedGamesAsync(steamId, context.IncludePlayedFreeGames, cancellationToken);

        var games = response.Response.Games?
            .Where(static x => !string.IsNullOrWhiteSpace(x.Name))
            .Select(x => new ExternalOwnedGame(x.AppId.ToString(), x.Name!.Trim()))
            .ToArray()
            ?? Array.Empty<ExternalOwnedGame>();

        return new ExternalLibrarySnapshot(
            requestedProfileId,
            steamId,
            null,
            games);
    }

    private async Task<string> ResolveSteamIdAsync(string profileId, CancellationToken cancellationToken)
    {
        if (ulong.TryParse(profileId, out _))
            return profileId;

        var uri = BuildRelativeUri(
            $"/ISteamUser/ResolveVanityURL/v1/?key={Uri.EscapeDataString(_options.ApiKey)}&vanityurl={Uri.EscapeDataString(profileId)}");
        using var response = await httpClient.GetAsync(uri, cancellationToken);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
            throw new InvalidOperationException("Steam API key is invalid or unauthorized.");

        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<ResolveVanityResponse>(cancellationToken: cancellationToken)
                      ?? throw new InvalidOperationException("Steam ResolveVanityURL response was empty.");

        if (payload.Response.Success != 1 ||
            string.IsNullOrWhiteSpace(payload.Response.SteamId))
        {
            throw new NotFoundException("Steam profile was not found.");
        }

        return payload.Response.SteamId;
    }

    private async Task<GetOwnedGamesEnvelope> GetOwnedGamesAsync(
        string steamId,
        bool includePlayedFreeGames,
        CancellationToken cancellationToken)
    {
        var uri =
            $"/IPlayerService/GetOwnedGames/v1/?key={Uri.EscapeDataString(_options.ApiKey)}" +
            $"&steamid={Uri.EscapeDataString(steamId)}" +
            "&include_appinfo=true" +
            $"&include_played_free_games={includePlayedFreeGames.ToString().ToLowerInvariant()}";

        using var response = await httpClient.GetAsync(BuildRelativeUri(uri), cancellationToken);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
            throw new BadRequestException("Steam profile library is private or unavailable for import.");

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<GetOwnedGamesEnvelope>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Steam GetOwnedGames response was empty.");
    }

    private string BuildRelativeUri(string uri)
    {
        if (httpClient.BaseAddress is not null)
            return uri;

        var baseUrl = string.IsNullOrWhiteSpace(_options.BaseUrl)
            ? "https://partner.steam-api.com"
            : _options.BaseUrl.TrimEnd('/');

        return $"{baseUrl}{uri}";
    }

    private sealed record ResolveVanityResponse(ResolveVanityPayload Response);

    private sealed record ResolveVanityPayload(int Success, string? SteamId);

    private sealed record GetOwnedGamesEnvelope(GetOwnedGamesPayload Response);

    private sealed record GetOwnedGamesPayload(int? GameCount, IReadOnlyCollection<SteamOwnedGame>? Games);

    private sealed record SteamOwnedGame(int AppId, string? Name);
}
