# Backend image for Render.
#
# A Dockerfile rather than Render's native .NET runtime, so the SDK version is
# pinned here instead of depending on which .NET versions the native image
# happens to ship this month. The project targets net10.0, and a silent SDK
# mismatch on the native runtime is the kind of failure that costs an afternoon.
#
# Build context is the REPOSITORY ROOT, not backend/, because the .env files, the
# render.yaml and the SQL all sit alongside the solution.

# ---------- build ----------
FROM mcr.microsoft.com/dotnet/sdk:10 AS build
WORKDIR /src

# Copied on their own layer first so a source-only change does not invalidate
# the restore. This is the single biggest win in a .NET container build.
#
# There is no Directory.Build.props in this repo, so the solution and the four
# csproj files are all that the restore layer needs. Adding one later means adding
# it here too, or the build fails with a file-not-found rather than a missing
# property.
COPY backend/*.slnx ./
COPY backend/src/FanHubPlus.Domain/*.csproj        src/FanHubPlus.Domain/
COPY backend/src/FanHubPlus.Application/*.csproj    src/FanHubPlus.Application/
COPY backend/src/FanHubPlus.Infrastructure/*.csproj src/FanHubPlus.Infrastructure/
COPY backend/src/FanHubPlus.Api/*.csproj            src/FanHubPlus.Api/

RUN dotnet restore src/FanHubPlus.Api/FanHubPlus.Api.csproj

COPY backend/ .
RUN dotnet publish src/FanHubPlus.Api/FanHubPlus.Api.csproj \
      -c Release \
      -o /app/publish \
      --no-restore

# ---------- runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:10 AS runtime

# The API needs the MySQL client only for the schema health probe in
# Program.cs; if that is ever removed this can go too.
RUN apt-get update \
 && apt-get install -y --no-install-recommends default-mysql-client \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

# Runs unprivileged. The base image ships an `app` user for exactly this.
USER $APP_UID

# Render routes to the port named by EXPOSE. ASP.NET Core 8+ images default to
# 8080; naming it explicitly means a change to that default cannot silently
# produce a health-check failure.
ENV ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_gcServer=1
EXPOSE 8080

ENTRYPOINT ["dotnet", "FanHubPlus.Api.dll"]
