using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;

namespace Shared.BuildingBlocks.Messaging;

/// <summary>
/// RabbitMQ publisher for integration events (RabbitMQ.Client v7+).
/// RoutingKey = full type name by default.
/// </summary>
public sealed class RabbitMqEventPublisher : IEventPublisher, IAsyncDisposable
{
    private readonly RabbitMqOptions _opt;

    private IConnection? _connection;
    private IChannel? _channel;

    public RabbitMqEventPublisher(IOptions<RabbitMqOptions> options)
    {
        _opt = options.Value;
    }

    /// <summary>Publishes an event to RabbitMQ exchange.</summary>
    public async Task PublishAsync<T>(T evt, CancellationToken ct = default) where T : class
    {
        await EnsureConnectedAsync(ct);

        var routingKey = typeof(T).FullName ?? typeof(T).Name;
        var json = JsonSerializer.Serialize(evt);
        var body = Encoding.UTF8.GetBytes(json);

        // v7: CreateBasicProperties removed; instantiate BasicProperties directly
        var props = new BasicProperties
        {
            Persistent = true,
            ContentType = "application/json",
            Type = routingKey
        };

        await _channel!.BasicPublishAsync(
            exchange: _opt.Exchange,
            routingKey: routingKey,
            mandatory: false,
            basicProperties: props,
            body: body,
            cancellationToken: ct);
    }

    private async Task EnsureConnectedAsync(CancellationToken ct)
    {
        if (_connection is not null && _channel is not null) return;

        var factory = new ConnectionFactory
        {
            HostName = _opt.HostName,
            Port = _opt.Port,
            UserName = _opt.UserName,
            Password = _opt.Password
        };

        _connection = await factory.CreateConnectionAsync(ct);
        _channel = await _connection.CreateChannelAsync(null, ct);

        await _channel.ExchangeDeclareAsync(
            exchange: _opt.Exchange,
            type: _opt.ExchangeType,
            durable: true,
            autoDelete: false,
            arguments: null,
            cancellationToken: ct);
    }

    public async ValueTask DisposeAsync()
    {
        if (_channel is not null) await _channel.DisposeAsync();
        if (_connection is not null) await _connection.DisposeAsync();
    }
}
