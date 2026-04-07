namespace Shared.BuildingBlocks.Messaging;

public interface IEventPublisher
{
    Task PublishAsync<T>(string routingKey, T payload, CancellationToken cancellationToken = default);
}