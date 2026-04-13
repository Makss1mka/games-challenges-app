using System.Net;
using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Globalization;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using Games.Application.Abstractions;
using Games.Application.Models;
using Games.Domain.Enums;
using Microsoft.Extensions.Options;
using Shared.BuildingBlocks.Exceptions;

namespace Games.Infrastructure.ExternalLibraries;

public sealed class SteamLibraryProvider(
    HttpClient httpClient,
    IOptions<SteamImportOptions> options,
    ILogger<SteamLibraryProvider> logger) : IExternalLibraryProvider
{
    private readonly SteamImportOptions _options = options.Value;
    private readonly ILogger<SteamLibraryProvider> _logger = logger;

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

        var ownedGames = response.Response.Games?
            .Where(static x => !string.IsNullOrWhiteSpace(x.Name))
            .ToArray()
            ?? Array.Empty<SteamOwnedGame>();

        var metadataMap = await LoadStoreMetadataAsync(
            ownedGames.Select(x => x.AppId.ToString()).ToArray(),
            cancellationToken);

        _logger.LogInformation("Steam import: fetched metadata for {Count} of {Total} games.", metadataMap.Count, ownedGames.Length);
        if (metadataMap.Count == 0 && ownedGames.Length > 0)
        {
            _logger.LogWarning("Steam import: metadata map is empty. Store API may be blocked or returning empty payloads.");
        }

        var games = ownedGames
            .Select(x =>
            {
                var appId = x.AppId.ToString();
                metadataMap.TryGetValue(appId, out var meta);

                return new ExternalOwnedGame(
                    appId,
                    x.Name!.Trim(),
                    meta?.Description,
                    meta?.Developer,
                    meta?.Publisher,
                    meta?.ReleaseDate,
                    meta?.ImageUrl,
                    meta?.Tags);
            })
            .ToArray();

        var withDescriptions = games.Count(static x => !string.IsNullOrWhiteSpace(x.Description));
        var withTags = games.Count(static x => x.Tags is { Count: > 0 });
        _logger.LogInformation(
            "Steam import payload: {Descriptions} descriptions, {Tags} tag sets present out of {Total} games.",
            withDescriptions,
            withTags,
            games.Length);

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
        if (steamId.Length != 17 || !steamId.All(char.IsDigit))
            throw new BadRequestException("Steam profile id must be a 17-digit SteamID64.");

        var uri =
            $"/IPlayerService/GetOwnedGames/v1/?key={Uri.EscapeDataString(_options.ApiKey)}" +
            $"&steamid={Uri.EscapeDataString(steamId)}" +
            "&include_appinfo=true" +
            $"&include_played_free_games={includePlayedFreeGames.ToString().ToLowerInvariant()}";

        using var response = await httpClient.GetAsync(BuildRelativeUri(uri), cancellationToken);

        if (response.StatusCode == HttpStatusCode.BadRequest)
            throw new BadRequestException("Steam profile id is invalid or the request was rejected.");

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

    private sealed record ExternalGameMetadata(
        string? Description,
        string? Developer,
        string? Publisher,
        DateOnly? ReleaseDate,
        string? ImageUrl,
        IReadOnlyCollection<string>? Tags);

    private async Task<IReadOnlyDictionary<string, ExternalGameMetadata>> LoadStoreMetadataAsync(
        IReadOnlyCollection<string> appIds,
        CancellationToken cancellationToken)
    {
        var results = new ConcurrentDictionary<string, ExternalGameMetadata>(StringComparer.OrdinalIgnoreCase);

        using var semaphore = new SemaphoreSlim(6);
        var tasks = appIds.Select(async appId =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                var metadata = await GetStoreMetadataAsync(appId, cancellationToken);
                if (metadata is not null)
                    results[appId] = metadata;
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);
        return new Dictionary<string, ExternalGameMetadata>(results, StringComparer.OrdinalIgnoreCase);
    }

    private async Task<ExternalGameMetadata?> GetStoreMetadataAsync(string appId, CancellationToken cancellationToken)
    {
        var uri = $"https://store.steampowered.com/api/appdetails?appids={Uri.EscapeDataString(appId)}&cc=us&l=en&filters=basic,genres,categories,release_date,developers,publishers";
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        request.Headers.UserAgent.ParseAdd("GamesChallengesApp/1.0");
        using var response = await httpClient.SendAsync(request, cancellationToken);
        _logger.LogDebug("Steam store request {AppId} => {Status}", appId, (int)response.StatusCode);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Steam store request failed for {AppId} with {Status}.", appId, (int)response.StatusCode);
            return null;
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(json))
        {
            _logger.LogWarning("Steam store response empty for {AppId}.", appId);
            return null;
        }

        _logger.LogDebug("Steam store payload sample for {AppId}: {Payload}", appId, json.Length > 1200 ? json[..1200] : json);

        try
        {
            using var document = JsonDocument.Parse(json);
            if (!document.RootElement.TryGetProperty(appId, out var appNode))
                return null;

            if (!appNode.TryGetProperty("success", out var successNode) || !successNode.GetBoolean())
                return null;

            if (!appNode.TryGetProperty("data", out var dataNode))
                return null;

            var description = ExtractDescription(dataNode);
            if (!string.IsNullOrWhiteSpace(description))
            {
                _logger.LogDebug("Steam store description loaded for {AppId}.", appId);
            }

            var releaseDate = ParseReleaseDate(ExtractString(dataNode, "release_date", "date"));
            var developer = ExtractFirstString(dataNode, "developers");
            var publisher = ExtractFirstString(dataNode, "publishers");
            var imageUrl = ExtractString(dataNode, "header_image")
                ?? ExtractString(dataNode, "capsule_image")
                ?? ExtractString(dataNode, "capsule_imagev5");

            var tags = new List<string>();
            tags.AddRange(ExtractTagDescriptions(dataNode, "genres"));
            tags.AddRange(ExtractTagDescriptions(dataNode, "categories"));

            var normalizedTags = tags
                .Where(static x => !string.IsNullOrWhiteSpace(x))
                .Select(static x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            return new ExternalGameMetadata(
                description,
                developer,
                publisher,
                releaseDate,
                imageUrl,
                normalizedTags);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Steam store JSON parse failed for {AppId}. Payload head: {Payload}", appId, json.Length > 200 ? json[..200] : json);
            return null;
        }
    }

    private static string? ExtractDescription(JsonElement dataNode)
    {
        var shortDescription = ExtractString(dataNode, "short_description");
        if (!string.IsNullOrWhiteSpace(shortDescription))
            return shortDescription;

        var aboutTheGame = ExtractString(dataNode, "about_the_game");
        if (!string.IsNullOrWhiteSpace(aboutTheGame))
            return StripHtml(aboutTheGame);

        var detailedDescription = ExtractString(dataNode, "detailed_description");
        if (!string.IsNullOrWhiteSpace(detailedDescription))
            return StripHtml(detailedDescription);

        return null;
    }

    private static string? ExtractString(JsonElement element, params string[] path)
    {
        var current = element;
        foreach (var segment in path)
        {
            if (!current.TryGetProperty(segment, out var next))
                return null;
            current = next;
        }

        return current.ValueKind == JsonValueKind.String ? current.GetString() : null;
    }

    private static string? ExtractFirstString(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var node))
            return null;

        if (node.ValueKind != JsonValueKind.Array)
            return null;

        foreach (var item in node.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
                return item.GetString();
        }

        return null;
    }

    private static IEnumerable<string> ExtractTagDescriptions(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var node) || node.ValueKind != JsonValueKind.Array)
            yield break;

        foreach (var entry in node.EnumerateArray())
        {
            if (entry.ValueKind != JsonValueKind.Object)
                continue;

            if (!entry.TryGetProperty("description", out var descriptionNode))
                continue;

            if (descriptionNode.ValueKind == JsonValueKind.String)
            {
                var value = descriptionNode.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                    yield return value;
            }
        }
    }

    private static string StripHtml(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return value;

        var builder = new StringBuilder(value.Length);
        var insideTag = false;

        foreach (var character in value)
        {
            if (character == '<')
            {
                insideTag = true;
                continue;
            }

            if (character == '>')
            {
                insideTag = false;
                continue;
            }

            if (!insideTag)
                builder.Append(character);
        }

        return builder.ToString().Trim();
    }

    private static DateOnly? ParseReleaseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (DateOnly.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            return parsed;

        if (DateOnly.TryParse(value, out parsed))
            return parsed;

        return null;
    }
}
