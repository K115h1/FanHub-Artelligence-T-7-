
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .

RUN dotnet restore src/FanHubPlus.Api/FanHubPlus.Api.csproj

RUN dotnet publish src/FanHubPlus.Api/FanHubPlus.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

CMD ASPNETCORE_URLS=http://0.0.0.0:$PORT dotnet FanHubPlus.Api.dll# Build context is the repository root (Render, and the Dockerfiles, need it), so
# the context is large. public/images alone is 158 MB of poster artwork and none
# of it is needed to build the API. The frontend image copies it separately.

# Dependencies and build output
node_modules
**/node_modules
**/bin
**/obj
**/dist
.vite

# VCS and editor noise
.git
.gitignore
.vscode
.idea
*.swp

# Local secrets — never into an image layer
.env
.env.*
!.env.example

# The one secret that must not ever be committed
my.ini
*.pfx
*.pem

# Render/Azure deployment artefacts
render.yaml.bak
Dockerfile.*
!Dockerfile

# The poster artwork, avatars and category banners. This is ~174 MB of committed
# binaries and the only image with a repo-root context is the database, which
# copies database/*.sql and nothing else. Excluding it takes that build context
# from 181 MB to well under 1 MB.
#
# The API image is unaffected: its context is backend/, which has no public/.
public/

# Docs are not needed at runtime
docs/
*.md
