# Games Challenges App

## Что исправлено

- В `users-api` и `games-api` добавлен единый обработчик исключений. Теперь бизнес-ошибки возвращаются как нормальные HTTP-ответы (`400/401/403/404/409`), а не валят запрос.
- Публикация в RabbitMQ стала безопасной: если брокер временно недоступен, `POST`-запрос не роняет приложение. Ошибка логируется, соединение сбрасывается, сервис продолжает работать.
- После успешных `POST`-операций сервисы публикуют события в RabbitMQ.

## События в брокере

Exchange: `games_challenges`  
Type: `topic`

Routing keys:

- `users.registered`
- `games.created`
- `library.items.added`

Формат сообщений: JSON в `camelCase`.

Примеры payload:

```json
{
  "id": "6d7bcb12-6e8f-4b2d-9f19-0f1f8d0d4d4a",
  "username": "roman",
  "email": "roman@example.com"
}
```

```json
{
  "id": "c7f07f7a-6a1b-4ec4-a2f1-bdc5c31e6b54",
  "title": "Hades",
  "slug": "hades",
  "tags": ["roguelike", "action"]
}
```

```json
{
  "userId": "3b1cdd2c-bd9d-45ad-baa7-9f71c7e0b702",
  "gameId": "c7f07f7a-6a1b-4ec4-a2f1-bdc5c31e6b54",
  "gameTitle": "Hades",
  "gameSlug": "hades",
  "source": "Manual",
  "status": "Planned",
  "addedAtUtc": "2026-04-07T12:15:00+00:00"
}
```

## Запуск RabbitMQ

1. Скопировать [`.env.template`](d:/games-challenges-app/games-challenges-app/.env.template) в `.env`
2. Из корня проекта выполнить:

```powershell
docker compose up -d rabbitmq
```

3. UI RabbitMQ: `http://localhost:15672`
4. Логин и пароль берутся из `.env`: `RABBITMQ_DEFAULT_USER` и `RABBITMQ_DEFAULT_PASS`

Exchange `games_challenges` создаётся автоматически при старте брокера.

## Инструкция для напарника

Чтобы его микросервис начал читать события, ему нужно:

1. Подключиться к RabbitMQ на `localhost:5672`
2. Объявить свою очередь
3. Привязать её к exchange `games_challenges`
4. Подписаться на нужный `routing key`

Пример на C#:

```csharp
using System.Text;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

var factory = new ConnectionFactory
{
    HostName = "localhost",
    Port = 5672,
    UserName = "app",
    Password = "app-password"
};

var connection = await factory.CreateConnectionAsync();
var channel = await connection.CreateChannelAsync();

await channel.ExchangeDeclareAsync("games_challenges", ExchangeType.Topic, durable: true);
await channel.QueueDeclareAsync("recommendations.games.created", durable: true, exclusive: false, autoDelete: false);
await channel.QueueBindAsync("recommendations.games.created", "games_challenges", "games.created");

var consumer = new AsyncEventingBasicConsumer(channel);
consumer.ReceivedAsync += async (_, ea) =>
{
    var json = Encoding.UTF8.GetString(ea.Body.ToArray());
    Console.WriteLine(json);
    await channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
};

await channel.BasicConsumeAsync("recommendations.games.created", autoAck: false, consumer);
```

Если ему нужно несколько групп событий, можно:

- привязать одну очередь к нескольким `routing key`
- использовать шаблоны вроде `games.*`
- завести отдельную очередь под каждый микросервис

## Переменные окружения

В [`.env.template`](d:/games-challenges-app/games-challenges-app/.env.template) уже добавлены:

- `RabbitMq__HostName`
- `RabbitMq__Port`
- `RabbitMq__UserName`
- `RabbitMq__Password`
- `RabbitMq__Exchange`
- `RabbitMq__AllowPublishFailures`

При локальном запуске вне Docker `users-api` и `games-api` по умолчанию смотрят на `localhost:5672`.

## Games Import

Games service now supports importing a user's library into the internal profile library.

Endpoints:

- `POST /api/library/me/import/steam`
- `POST /api/library/me/import/epic-games`

Steam requirements:

- set `SteamImport__ApiKey` in `.env`
- pass either a numeric SteamID64 or a vanity profile name in `profileId`

Example Steam request:

```json
{
  "profileId": "76561198000000000",
  "includePlayedFreeGames": true,
  "importedGamesStatus": 0
}
```

Notes:

- imported games are added with source `Steam`
- duplicate library items are skipped
- if a Steam game is not present in the local catalog, it is created automatically
- Epic Games endpoint is scaffolded, but currently returns `501 Not Implemented`
