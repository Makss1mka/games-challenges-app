namespace Games.Infrastructure.ExternalLibraries;

public sealed class SteamImportOptions
{
    public const string SectionName = "SteamImport";

    public string ApiKey { get; init; } = string.Empty;
    public string BaseUrl { get; init; } = "https://api.steampowered.com";
}
