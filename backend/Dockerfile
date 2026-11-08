# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY EngMastery.Api/*.csproj EngMastery.Api/
RUN dotnet restore EngMastery.Api/EngMastery.Api.csproj
COPY . .
# Frontend SPA is copied into wwwroot by CI/deploy before docker build,
# or served separately by the frontend container. Build API only here.
RUN dotnet publish EngMastery.Api/EngMastery.Api.csproj -c Release -o /app/publish --no-restore

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
# SQLite database lives here (mounted volume in compose)
VOLUME ["/app/data"]
ENV ConnectionStrings__Sqlite="Data Source=/app/data/engmastery.db"
ENV ASPNETCORE_URLS="http://+:8090"
EXPOSE 8090
ENTRYPOINT ["dotnet", "EngMastery.Api.dll"]
