using EngMastery.Api.Data;
using EngMastery.Api.Services;
using Microsoft.EntityFrameworkCore;

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

builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

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

app.UseCors();

// Serve the React SPA (frontend/dist copied to wwwroot) for home-server single-port deploy.
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
// SPA fallback: anything not /api serves index.html.
app.MapFallbackToFile("index.html", new StaticFileOptions());

app.Run();
