using EngMastery.Api.Auth;
using EngMastery.Api.Data;
using EngMastery.Api.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;

// Utility: `dotnet run -- --hash-password "my secret"` prints a hash for Auth__PasswordHash.
if (args.Length == 2 && args[0] == "--hash-password")
{
    Console.WriteLine(AccessGate.HashPassword(args[1]));
    return;
}

var builder = WebApplication.CreateBuilder(args);

// Database: SQL Server if connection string provided, else SQLite fallback.
string? sqlServerCs = builder.Configuration.GetConnectionString("SqlServer");
string dbProvider = builder.Configuration.GetValue<string>("Database:Provider") ?? "auto";
bool useSqlServer = dbProvider.Equals("sqlserver", StringComparison.OrdinalIgnoreCase)
    || (!dbProvider.Equals("sqlite", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(sqlServerCs));

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    if (useSqlServer)
        opt.UseSqlServer(sqlServerCs!);
    else
        opt.UseSqlite(ResolveSqliteConnectionString(
            builder.Configuration.GetConnectionString("Sqlite") ?? "Data Source=appdata/engmastery.db"));
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient("gemini", c => c.Timeout = TimeSpan.FromSeconds(60));
builder.Services.AddScoped<SettingsService>();
builder.Services.AddScoped<StudyLogService>();
builder.Services.AddScoped<GeminiService>();

// Single-user password gate (cookie valid for Auth:SessionDays). See deploy/README notes.
builder.Services.Configure<AccessGateOptions>(builder.Configuration.GetSection("Auth"));
builder.Services.AddSingleton<AccessGate>();

// Behind Cloudflare Tunnel / nginx the real scheme and client IP arrive in X-Forwarded-*.
builder.Services.Configure<ForwardedHeadersOptions>(opt =>
{
    opt.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    opt.KnownNetworks.Clear();
    opt.KnownProxies.Clear();
});

// Same-origin SPA needs no CORS. Only add the policy when origins are explicitly configured.
string[] allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
{
    if (allowedOrigins.Length > 0)
        p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
}));

var app = builder.Build();

var accessGate = app.Services.GetRequiredService<AccessGate>();
if (!accessGate.HasCredential)
{
    if (accessGate.Enabled && !app.Environment.IsDevelopment())
        throw new InvalidOperationException(
            "Access gate is enabled but no password is configured. Set Auth__Password (or Auth__PasswordHash) " +
            "in the service environment before exposing this instance.");
    app.Logger.LogWarning("Access gate disabled: no Auth:Password configured (allowed only for local development).");
}
else if (!accessGate.Enabled)
{
    app.Logger.LogWarning("Access gate is explicitly disabled (Auth:Enabled=false). The app is open to anyone with the URL.");
}

// SQLite data file must live outside folders replaced by deploy (server/ is wiped each release).
// Relative paths resolve against the app base directory; the folder is auto-created.
static string ResolveSqliteConnectionString(string cs)
{
    const string key = "Data Source=";
    int i = cs.IndexOf(key, StringComparison.OrdinalIgnoreCase);
    if (i < 0) return cs;
    string path = cs[(i + key.Length)..].Trim().Trim('"');
    if (!Path.IsPathRooted(path))
        path = Path.Combine(AppContext.BaseDirectory, path);
    string? dir = Path.GetDirectoryName(path);
    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
    return cs[..(i + key.Length)] + path;
}

// Auto-migrate + seed on startup.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    try
    {
        await DataSeeder.SeedAsync(db);
        logger.LogInformation("Database ready (provider: {Provider}).", useSqlServer ? "SqlServer" : "SQLite");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database migration/seed failed.");
        throw;
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseForwardedHeaders();
app.UseCors();
app.UseMiddleware<AccessGateMiddleware>();

// Serve the React SPA (frontend/dist copied to wwwroot) for home-server single-port deploy.
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
// SPA fallback: anything not /api serves index.html.
app.MapFallbackToFile("index.html", new StaticFileOptions());

app.Run();
