using EngMastery.Api.Auth;
using Microsoft.AspNetCore.Mvc;

namespace EngMastery.Api.Controllers;

public record LoginRequest(string? Password);
public record LoginResponse(bool Ok, DateTimeOffset ExpiresAt);
public record SessionResponse(bool Authenticated, bool Enabled);

[ApiController]
[Route("api/auth")]
public class AuthController(AccessGate gate, ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("login")]
    public ActionResult<LoginResponse> Login([FromBody] LoginRequest? request)
    {
        if (!gate.IsActive)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Cổng truy cập chưa được cấu hình." });

        string client = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        LoginAttemptResult result = gate.Authenticate(client, request?.Password ?? "");

        if (!result.Success)
        {
            if (result.RetryAfter is { } retryAfter)
            {
                Response.Headers.RetryAfter = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
                return StatusCode(StatusCodes.Status429TooManyRequests, new { error = result.Error });
            }

            return Unauthorized(new { error = result.Error });
        }

        DateTimeOffset expires = DateTimeOffset.UtcNow.Add(gate.SessionLifetime);
        Response.Cookies.Append(AccessGate.CookieName, gate.CreateToken(expires), new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = expires,
            MaxAge = gate.SessionLifetime,
            IsEssential = true,
        });

        logger.LogInformation("Signed in from {Client}; session valid until {Expires:u}.", client, expires);
        return Ok(new LoginResponse(true, expires));
    }

    [HttpPost("logout")]
    public ActionResult Logout()
    {
        Response.Cookies.Delete(AccessGate.CookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/",
        });

        return Ok(new { ok = true });
    }

    [HttpGet("session")]
    public ActionResult<SessionResponse> Session()
    {
        bool authenticated = gate.ValidateToken(Request.Cookies[AccessGate.CookieName]);
        return Ok(new SessionResponse(authenticated, gate.IsActive));
    }
}
