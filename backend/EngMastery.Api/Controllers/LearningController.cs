using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using EngMastery.Api.Data;
using EngMastery.Api.Models;
using EngMastery.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EngMastery.Api.Controllers;

public record LessonProgress(string LessonId, string CompletedOn, string NextReviewOn, int Completions, int IndependentCount);
public record CompleteLessonRequest([Range(0, 3)] int IndependentCount);

[ApiController]
[Route("api/learning")]
public class LearningController(AppDbContext db) : ControllerBase
{
    public const string Prefix = "Learning.v1.lesson.";
    public static readonly HashSet<string> LessonIds = new(Enumerable.Range(1, 36).Select(i => $"foundation-{i:00}"));
    // The application is single-user. Serialize read/modify/write and credit the log atomically.
    private static readonly SemaphoreSlim CompletionGate = new(1, 1);

    [HttpGet("progress")]
    public async Task<ActionResult<Dictionary<string, LessonProgress>>> Progress()
    {
        var rows = await db.AppSettings.AsNoTracking().Where(x => x.Key.StartsWith(Prefix)).Take(100).ToListAsync();
        var result = new Dictionary<string, LessonProgress>();
        foreach (var row in rows)
        {
            if (!LessonIds.Contains(row.Key[Prefix.Length..])) continue;
            var progress = JsonSerializer.Deserialize<LessonProgress>(row.Value);
            if (progress is not null) result[progress.LessonId] = progress;
        }
        return result;
    }

    [HttpPut("lessons/{id}/completion")]
    public async Task<ActionResult<LessonProgress>> Complete(string id, CompleteLessonRequest request)
    {
        if (!LessonIds.Contains(id)) return NotFound(new { code = "lesson_not_found", message = "Không tìm thấy bài học." });
        await CompletionGate.WaitAsync(HttpContext.RequestAborted);
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            var row = await db.AppSettings.FindAsync(Prefix + id);
            var previous = row is null ? null : JsonSerializer.Deserialize<LessonProgress>(row.Value);
            var today = StudyLogService.TodayUtc();
            var date = today.ToString("yyyy-MM-dd");
            // Retrying a lost response or practising again today must not inflate progress.
            if (previous?.CompletedOn == date) return Ok(previous);
            int count = (previous?.Completions ?? 0) + 1;
            int interval = request.IndependentCount < 3 ? 1 : count switch { 1 => 1, 2 => 3, 3 => 7, _ => 14 };
            var progress = new LessonProgress(id, date, today.AddDays(interval).ToString("yyyy-MM-dd"), count, request.IndependentCount);
            if (row is null) db.AppSettings.Add(new AppSetting { Key = Prefix + id, Value = JsonSerializer.Serialize(progress) });
            else row.Value = JsonSerializer.Serialize(progress);
            var log = await db.StudyLogs.FirstOrDefaultAsync(x => x.StudyDate == today);
            if (log is null) { log = new StudyLog { StudyDate = today }; db.StudyLogs.Add(log); }
            log.DrillsCompleted += 1;
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Ok(progress);
        }
        finally { CompletionGate.Release(); }
    }
}
