using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;

namespace Shared.BuildingBlocks.Messaging;

public sealed class RabbitMqEventPublisher(
    IOptions<RabbitMqOptions> options,
    ILogger<RabbitMqEventPublisher> logger) : IEventPublisher, IAsyncDisposable
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters =
        {
            new JsonStringEnumConverter()
        }
    };

    private readonly RabbitMqOptions _options = options.Value;
    private readonly ILogger<RabbitMqEventPublisher> _logger = logger;
    private readonly SemaphoreSlim _connectionLock = new(1, 1);
    private IConnection? _connection;
    private IChannel? _channel;

    public async Task PublishAsync<T>(
        string routingKey,
        T payload,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation(
                "RabbitMQ publishing is disabled. Event with routing key {RoutingKey} was skipped.",
                routingKey);
            return;
        }

        try
        {
            await EnsureConnectedAsync(cancellationToken);

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload, SerializerOptions));

            await _channel!.BasicPublishAsync(
                exchange: _options.Exchange,
                routingKey: routingKey,
                mandatory: false,
                body: body,
                cancellationToken: cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            await ResetConnectionAsync();

            _logger.LogError(
                exception,
                "Failed to publish RabbitMQ event {RoutingKey} to exchange {Exchange}.",
                routingKey,
                _options.Exchange);

            if (!_options.AllowPublishFailures)
                throw;
        }
    }

    private async Task EnsureConnectedAsync(CancellationToken cancellationToken)
    {
        if (_connection is { IsOpen: true } && _channel is { IsOpen: true })
            return;

        await _connectionLock.WaitAsync(cancellationToken);

        try
        {
            if (_connection is { IsOpen: true } && _channel is { IsOpen: true })
                return;

            await ResetConnectionAsync();

            var factory = new ConnectionFactory
            {
                HostName = _options.HostName,
                Port = _options.Port,
                UserName = _options.UserName,
                Password = _options.Password,
                AutomaticRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(10),
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
        finally
        {
            _connectionLock.Release();
        }
    }

    private async Task ResetConnectionAsync()
    {
        if (_channel is not null)
        {
            await _channel.DisposeAsync();
            _channel = null;
        }

        if (_connection is not null)
        {
            await _connection.DisposeAsync();
            _connection = null;
        }
    }

    public async ValueTask DisposeAsync()
    {
        await ResetConnectionAsync();
        _connectionLock.Dispose();
    }
}
