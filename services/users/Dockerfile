FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY services/users/src/Users.Api/Users.Api.csproj services/users/src/Users.Api/
COPY services/users/src/Users.Application/Users.Application.csproj services/users/src/Users.Application/
COPY services/users/src/Users.Domain/Users.Domain.csproj services/users/src/Users.Domain/
COPY services/users/src/Users.Infrastructure/Users.Infrastructure.csproj services/users/src/Users.Infrastructure/
COPY services/shared/Shared.BuildingBlocks/Shared.BuildingBlocks.csproj services/shared/Shared.BuildingBlocks/
COPY services/shared/Shared.Contracts/Shared.Contracts.csproj services/shared/Shared.Contracts/

RUN dotnet restore services/users/src/Users.Api/Users.Api.csproj
RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

COPY services/users/src/ services/users/src/
COPY services/shared/ services/shared/

RUN dotnet publish services/users/src/Users.Api/Users.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Users.Api.dll"]
