# API image for Render.
#
# BUILD CONTEXT IS backend/, NOT THE REPO ROOT.
#   That is deliberate. The API needs nothing outside this folder, and the repo
#   root carries ~174 MB of poster artwork under public/images. A root context
#   would ship all of it to the daemon on every build and then throw it away.
#   It also means the sibling .dockerignore applies, since Docker only reads one
#   .dockerignore — the one at the root of the context.
#
#   Consequence: paths below are relative to backend/, and the database image
#   (deploy/mysql/Dockerfile) is unaffected because it genuinely does need
#   database/ and therefore keeps the repo root as its context.
#
# Two stages: SDK to build, ASP.NET runtime to run. The runtime image has no
# compiler, MSBuild or NuGet client in it, which is most of the size saving.

# ---------- build ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore on its own layer, copied before any source. A change to a .cs file then
# does not invalidate the restore, which is the single biggest win in a .NET
# container build.
#
# There is no Directory.Build.props in this repo, so the solution and the four
# project files are the whole dependency graph. Adding one means adding it here
# too, or the build fails on a missing file rather than a missing property.
COPY FanHubPlus.slnx ./
COPY src/FanHubPlus.Domain/*.csproj        src/FanHubPlus.Domain/
COPY src/FanHubPlus.Application/*.csproj    src/FanHubPlus.Application/
COPY src/FanHubPlus.Infrastructure/*.csproj src/FanHubPlus.Infrastructure/
COPY src/FanHubPlus.Api/*.csproj            src/FanHubPlus.Api/

RUN dotnet restore src/FanHubPlus.Api/FanHubPlus.Api.csproj

COPY . .
RUN dotnet publish src/FanHubPlus.Api/FanHubPlus.Api.csproj \
      -c Release \
      -o /app/publish \
      --no-restore

# ---------- runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

# mysql-client is not needed by the app. It is here because the container has no
# other way to prove the database is reachable, and "is the API actually talking
# to MySQL" is the first question when a deploy misbehaves. Delete this line and
# the apt layer together if you would rather keep the image smaller.
RUN apt-get update \
 && apt-get install -y --no-install-recommends default-mysql-client \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

# The bind address is decided in the entrypoint, not here: Render injects PORT at
# run time, and a Dockerfile ENV cannot express a run-time default. Do not set
# ASPNETCORE_URLS or ASPNETCORE_HTTP_PORTS here — the entrypoint owns it.
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Documents the default port for a local `docker run` and for anything that reads
# EXPOSE. Render routes to the port the entrypoint actually binds, which is $PORT.
EXPOSE 8080

# Unprivileged. The aspnet images ship an `app` user for exactly this; running as
# root inside a container is not a vulnerability here, but it is a habit worth
# not forming.
USER $APP_UID

ENTRYPOINT ["./docker-entrypoint.sh"]
