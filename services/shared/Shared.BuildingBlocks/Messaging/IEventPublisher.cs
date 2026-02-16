namespace Shared.BuildingBlocks.Messaging;


public interface IEventPublisher
{
    Task PublishAsync<T>(T evt, CancellationToken ct = default) where T : class;
}
