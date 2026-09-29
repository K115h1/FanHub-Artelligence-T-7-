#!/bin/sh
# Render injects PORT and expects the app to bind to it on 0.0.0.0.
#
# Why this is a script and not an ENV line in the Dockerfile: Dockerfile ENV
# expands $PORT but does not support shell default syntax, so
#
#     ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080}
#
# would evaluate at BUILD time, when PORT does not exist yet, producing
# "http://0.0.0.0:" and an app that binds nowhere. The defaulting has to happen
# at RUN time, in a shell.
#
# 0.0.0.0 rather than localhost is not optional. Kestrel binding to 127.0.0.1
# inside a container is unreachable from outside it, so Render's proxy connects
# and gets connection refused. This is the single most common reason a
# containerised .NET app "deploys" and then 502s.
set -e

# The host part is fixed; only the port is Render's business. Kestrel reads
# ASPNETCORE_URLS when it is set, and the app's own configuration leaves it unset,
# so this is the single place the bind address is decided.
export ASPNETCORE_URLS="http://0.0.0.0:${PORT:-8080}"

echo "starting on ${ASPNETCORE_URLS} (PORT=${PORT:-unset})"

# exec so the dotnet process becomes PID 1 and receives SIGTERM directly. Without
# it, sh stays in front and Render's graceful shutdown becomes a 30-second wait
# followed by SIGKILL.
exec dotnet FanHubPlus.Api.dll
