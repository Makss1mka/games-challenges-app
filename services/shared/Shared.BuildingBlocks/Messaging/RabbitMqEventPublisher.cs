using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;

namespace Shared.BuildingBlocks.Messaging;

public sealed class RabbitMqEventPublisher(IOptions<RabbitMqOptions> options) : IEventPublisher, IAsyncDisposable
{
    private readonly RabbitMqOptions _options = options.Value;
    private IConnection? _connection;
    private IChannel? _channel;

    public async Task PublishAsync<T>(
        string routingKey,
        T payload,
        CancellationToken cancellationToken = default)
    {
        await EnsureConnectedAsync(cancellationToken);

        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload));

        await _channel!.BasicPublishAsync(
            exchange: _options.Exchange,
            routingKey: routingKey,
            mandatory: false,
            body: body,
            cancellationToken: cancellationToken);
    }

    private async Task EnsureConnectedAsync(CancellationToken cancellationToken)
    {
        if (_connection is not null && _channel is not null)
            return;

        var factory = new ConnectionFactory
        {
            HostName = _options.HostName,
            Port = _options.Port,
            UserName = _options.UserName,
            Password = _options.Password,
        };

        _connection = await factory.CreateConnectionAsync(cancellationToken);
        _channel = await _connection.CreateChannelAsync(cancellationToken: cancellationToken);

        await _channel.ExchangeDeclareAsync(
            exchange: _options.Exchange,
            type: _options.ExchangeType,
            durable: true,
            autoDelete: false,
            arguments: null,
            cancellationToken: cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        if (_channel is not null)
            await _channel.DisposeAsync();

        if (_connection is not null)
            await _connection.DisposeAsync();
    }
}