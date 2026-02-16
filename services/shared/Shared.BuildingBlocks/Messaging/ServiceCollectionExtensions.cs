using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Shared.BuildingBlocks.Messaging;

namespace Shared.BuildingBlocks;

public static class ServiceCollectionExtensions
{
    /// <summary>Adds RabbitMQ publisher.</summary>
    public static IServiceCollection AddRabbitMqPublisher(this IServiceCollection services, IConfiguration cfg)
    {
        services.Configure<RabbitMqOptions>(opt => cfg.GetSection("RabbitMq").Bind(opt));
        services.AddSingleton<IEventPublisher, RabbitMqEventPublisher>();
        return services;
    }
}
