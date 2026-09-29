FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/ .

RUN dotnet restore src/FanHubPlus.Api/FanHubPlus.Api.csproj
RUN dotnet publish src/FanHubPlus.Api/FanHubPlus.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

CMD ASPNETCORE_URLS=http://0.0.0.0:$PORT dotnet FanHubPlus.Api.dll
