using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace EngMastery.Api.Auth;

/// <summary>
/// Single-user access gate for an otherwise unauthenticated app.
/// Enabled by default; refuses to run open once a credential is configured.
/// </summary>
public sealed class AccessGateOptions
{
    public bool Enabled { get; set; } = true;

    /// <summary>Plain-text password (simplest). Prefer <see cref="PasswordHash"/> when possible.</summary>
    public string Password { get; set; } = "";

    /// <summary>PBKDF2 hash produced by <c>--hash-password</c>. Takes precedence over <see cref="Password"/>.</summary>
    public string PasswordHash { get; set; } = "";

    /// <summary>How long a device stays signed in before the password is asked again.</summary>
    public int SessionDays { get; set; } = 7;

    public int MaxFailedAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
}

public sealed record LoginAttemptResult(bool Success, string? Error, TimeSpan? RetryAfter);

public sealed class AccessGate
{
    public const string CookieName = "engmastery_access";

    private readonly AccessGateOptions _options;
    private readonly ILogger<AccessGate> _logger;
    private readonly byte[] _signingKey;
    private readonly object _sync = new();
    private readonly Dictionary<string, Attempts> _attempts = new(StringComparer.OrdinalIgnoreCase);

    private sealed class Attempts
    {
        public int Count;
        public DateTimeOffset WindowStart;
        public DateTimeOffset? LockedUntil;
    }

    public AccessGate(IOptions<AccessGateOptions> options, ILogger<AccessGate> logger)
    {
        _options = options.Value;
        _logger = logger;
        string material = CredentialMaterial(_options);
        // 100k iterations so the cookie key is as expensive to guess as the password itself.
        _signingKey = Rfc2898DeriveBytes.Pbkdf2(
            "engmastery-gate-v1|" + material, Encoding.UTF8.GetBytes("engmastery-gate-v1"),
            100_000, HashAlgorithmName.SHA256, 32);
    }

    public bool Enabled => _options.Enabled;
    public bool IsActive => _options.Enabled && HasCredential;
    public bool HasCredential => !string.IsNullOrWhiteSpace(_options.Password) || !string.IsNullOrWhiteSpace(_options.PasswordHash);
    public TimeSpan SessionLifetime => TimeSpan.FromDays(Math.Clamp(_options.SessionDays, 1, 90));

    private static string CredentialMaterial(AccessGateOptions options) =>
        !string.IsNullOrWhiteSpace(options.PasswordHash) ? options.PasswordHash : options.Password;

    public LoginAttemptResult Authenticate(string clientKey, string password)
    {
        var now = DateTimeOffset.UtcNow;
        var lockout = TimeSpan.FromMinutes(Math.Max(1, _options.LockoutMinutes));
        int maxAttempts = Math.Max(1, _options.MaxFailedAttempts);

        lock (_sync)
        {
            Prune(now, lockout);

            if (!_attempts.TryGetValue(clientKey, out var attempts))
            {
                attempts = new Attempts { WindowStart = now };
                _attempts[clientKey] = attempts;
            }
            else if (attempts.LockedUntil is { } until && until > now)
            {
                return new LoginAttemptResult(false, "Sai quá nhiều lần. Vui lòng thử lại sau.", until - now);
            }
            else if (attempts.LockedUntil is not null)
            {
                attempts.LockedUntil = null;
                attempts.Count = 0;
                attempts.WindowStart = now;
            }
            else if (now - attempts.WindowStart > lockout)
            {
                attempts.Count = 0;
                attempts.WindowStart = now;
            }

            if (VerifyPassword(password))
            {
                _attempts.Remove(clientKey);
                _logger.LogInformation("Access granted for {Client}.", clientKey);
                return new LoginAttemptResult(true, null, null);
            }

            attempts.Count++;
            if (attempts.Count >= maxAttempts)
            {
                attempts.LockedUntil = now.Add(lockout);
                attempts.Count = 0;
                _logger.LogWarning("Access gate locked out {Client} for {Minutes} minutes.", clientKey, lockout.TotalMinutes);
                return new LoginAttemptResult(false, "Sai quá nhiều lần. Vui lòng thử lại sau.", lockout);
            }

            _logger.LogWarning("Failed access attempt from {Client} ({Count}/{Max}).", clientKey, attempts.Count, maxAttempts);
            return new LoginAttemptResult(false, "Mật khẩu không đúng.", null);
        }
    }

    private void Prune(DateTimeOffset now, TimeSpan window)
    {
        if (_attempts.Count < 256) return;
        foreach (var key in _attempts.Where(p => p.Value.LockedUntil is null && now - p.Value.WindowStart > window)
                     .Select(p => p.Key).ToList())
        {
            _attempts.Remove(key);
        }
    }

    private bool VerifyPassword(string password)
    {
        if (string.IsNullOrEmpty(password) || password.Length > 512) return false;

        string stored = _options.PasswordHash;
        if (!string.IsNullOrWhiteSpace(stored))
            return VerifyPbkdf2(password, stored);

        byte[] given = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        byte[] expected = SHA256.HashData(Encoding.UTF8.GetBytes(_options.Password ?? ""));
        return CryptographicOperations.FixedTimeEquals(given, expected);
    }

    public string CreateToken(DateTimeOffset expires)
    {
        string payload = "v1." + expires.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        return payload + "." + Sign(payload);
    }

    public bool ValidateToken(string? token)
    {
        if (string.IsNullOrEmpty(token) || token.Length > 256) return false;

        string[] parts = token.Split('.');
        if (parts.Length != 3 || parts[0] != "v1") return false;
        if (!long.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out long expires)) return false;
        if (expires <= DateTimeOffset.UtcNow.ToUnixTimeSeconds()) return false;

        string expected = Sign("v1." + parts[1]);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected), Encoding.ASCII.GetBytes(parts[2]));
    }

    private string Sign(string payload) => Base64Url(HMACSHA256.HashData(_signingKey, Encoding.UTF8.GetBytes(payload)));

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static bool VerifyPbkdf2(string password, string stored)
    {
        string[] parts = stored.Split('$');
        if (parts.Length != 4 || !parts[0].Equals("pbkdf2-sha256", StringComparison.OrdinalIgnoreCase)) return false;
        if (!int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out int iterations) || iterations < 10_000)
            return false;

        try
        {
            byte[] salt = Convert.FromBase64String(parts[2]);
            byte[] expected = Convert.FromBase64String(parts[3]);
            byte[] actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public static string HashPassword(string password, int iterations = 210_000)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, 32);
        return $"pbkdf2-sha256${iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }
}

/// <summary>
/// Blocks every request (API + SPA) until the access cookie is present, except the login page itself.
/// </summary>
public sealed class AccessGateMiddleware
{
    private readonly RequestDelegate _next;

    public AccessGateMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, AccessGate gate)
    {
        if (!gate.IsActive)
        {
            await _next(context);
            return;
        }

        PathString path = context.Request.Path;

        // Login/logout/session endpoints handle their own checks.
        if (path.StartsWithSegments("/api/auth", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        bool authenticated = gate.ValidateToken(context.Request.Cookies[AccessGate.CookieName]);

        if (authenticated)
        {
            if (path == "/login" || path == "/login.html")
            {
                context.Response.Redirect("/");
                return;
            }

            await _next(context);
            return;
        }

        if (IsPublic(path))
        {
            if (path == "/login")
            {
                context.Request.Path = "/login.html";
                // The SPA fallback route matches "/login" first; clear it so static files can serve the page.
                context.SetEndpoint(null);
            }

            await _next(context);
            return;
        }

        if (path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json; charset=utf-8";
            await context.Response.WriteAsync("{\"error\":\"Bạn cần đăng nhập để tiếp tục.\"}");
            return;
        }

        string next = path + context.Request.QueryString;
        context.Response.Redirect("/login?next=" + Uri.EscapeDataString(next));
    }

    private static bool IsPublic(PathString path) =>
        path == "/login"
        || path == "/login.html"
        || path == "/dbi-logo.svg"
        || path.StartsWithSegments("/favicon");
}
