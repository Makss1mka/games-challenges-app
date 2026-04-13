using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Shared.BuildingBlocks.Messaging;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddRabbitMqPublisher(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<RabbitMqOptions>(
            configuration.GetSection(RabbitMqOptions.SectionName));

        services.AddSingleton<IEventPublisher, RabbitMqEventPublisher>();

        return services;
    }
}