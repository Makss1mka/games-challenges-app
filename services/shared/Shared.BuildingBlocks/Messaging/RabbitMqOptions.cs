namespace Shared.BuildingBlocks.Messaging;

public sealed class RabbitMqOptions
{
    public string HostName { get; init; } = "localhost";
    public int Port { get; init; } = 5672;
    public string UserName { get; init; } = "guest";
    public string Password { get; init; } = "guest";

    public string Exchange { get; init; } = "integration.events";

    public string ExchangeType { get; init; } = "topic";
}
