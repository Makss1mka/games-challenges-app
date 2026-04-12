FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY services/games/src/Games.Api/Games.Api.csproj services/games/src/Games.Api/
COPY services/games/src/Games.Application/Games.Application.csproj services/games/src/Games.Application/
COPY services/games/src/Games.Domain/Games.Domain.csproj services/games/src/Games.Domain/
COPY services/games/src/Games.Infrastructure/Games.Infrastructure.csproj services/games/src/Games.Infrastructure/
COPY services/shared/Shared.BuildingBlocks/Shared.BuildingBlocks.csproj services/shared/Shared.BuildingBlocks/
COPY services/shared/Shared.Contracts/Shared.Contracts.csproj services/shared/Shared.Contracts/

RUN dotnet restore services/games/src/Games.Api/Games.Api.csproj
RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

COPY services/games/src/ services/games/src/
COPY services/shared/ services/shared/

RUN dotnet publish services/games/src/Games.Api/Games.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Games.Api.dll"]
