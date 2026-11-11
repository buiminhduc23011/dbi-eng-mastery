using EngMastery.Api.Data;
using EngMastery.Api.Dtos;
using EngMastery.Api.Models;
using EngMastery.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace EngMastery.Api.Controllers;

[ApiController]
[Route("api/drills")]
public class DrillsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly StudyLogService _logs;

    public DrillsController(AppDbContext db, StudyLogService logs)
    {
        _db = db;
        _logs = logs;
    }

    [HttpGet]
    public async Task<ActionResult<List<DrillDto>>> List([FromQuery] string? category = null, [FromQuery] int take = 100)
    {
        var q = _db.SentenceDrills.AsQueryable();
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(d => d.Category == category);
        var drills = await q.OrderBy(d => d.NextReviewDate).Take(Math.Clamp(take, 1, 500)).ToListAsync();
        return drills.Select(DtoMapper.ToDto).ToList();
    }

    [HttpGet("due")]
    public async Task<ActionResult<List<DrillDto>>> Due([FromQuery] int take = 20)
    {
        var now = DateTime.UtcNow;
        var drills = await _db.SentenceDrills
            .Where(d => d.NextReviewDate <= now)
            .OrderBy(d => d.NextReviewDate)
            .Take(Math.Clamp(take, 1, 100))
            .ToListAsync();
        return drills.Select(DtoMapper.ToDto).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DrillDto>> Get(int id)
    {
        var d = await _db.SentenceDrills.FindAsync(id);
        return d is null ? NotFound() : DtoMapper.ToDto(d);
    }

    /// <summary>Offline grading: no AI cost. Simple Leitner-style rescheduling.</summary>
    [HttpPost("{id}/submit")]
    public async Task<ActionResult<DrillResultDto>> Submit(int id, [FromBody] SubmitDrillDto dto)
    {
        var d = await _db.SentenceDrills.FindAsync(id);
        if (d is null) return NotFound();
        var alts = DtoMapper.FromJson(d.AlternativesEnJson);
        var kws = DtoMapper.FromJson(d.KeywordsJson);
        var s = OfflineEvaluator.ScoreDrill(dto.UserInput ?? string.Empty, d.TargetEn, alts, kws);

        d.PracticeCount++;
        d.LastScore = s.Score;
        d.NextReviewDate = DateTime.UtcNow.AddDays(s.Score >= 80 ? 4 : s.Score >= 60 ? 2 : 1);
        await _db.SaveChangesAsync();
        await _logs.LogActivityAsync(drills: 1);

        return new DrillResultDto(s.Score, s.KeywordsMatched, s.KeywordsTotal, s.Similarity,
            s.MatchedWords, s.MissedWords, d.TargetEn, alts, d.GrammarNote);
    }

    [HttpPost]
    public async Task<ActionResult<DrillDto>> Create([FromBody] CreateDrillDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PromptVi) || string.IsNullOrWhiteSpace(dto.TargetEn))
            return BadRequest("PromptVi and TargetEn are required.");
        var d = new SentenceDrill
        {
            Category = string.IsNullOrWhiteSpace(dto.Category) ? "Daily & Casual" : dto.Category,
            PromptVi = dto.PromptVi,
            TargetEn = dto.TargetEn,
            AlternativesEnJson = JsonSerializer.Serialize(dto.AlternativesEn ?? new List<string>()),
            KeywordsJson = JsonSerializer.Serialize(dto.Keywords ?? new List<string>()),
            GrammarNote = dto.GrammarNote ?? string.Empty,
            NextReviewDate = DateTime.UtcNow,
        };
        _db.SentenceDrills.Add(d);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = d.Id }, DtoMapper.ToDto(d));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var d = await _db.SentenceDrills.FindAsync(id);
        if (d is null) return NotFound();
        _db.SentenceDrills.Remove(d);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateDrillDto(
    string Category, string PromptVi, string TargetEn,
    List<string>? AlternativesEn, List<string>? Keywords, string? GrammarNote);

[ApiController]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly GeminiService _gemini;
    private readonly StudyLogService _logs;
    private readonly AppDbContext _db;

    public AiController(GeminiService gemini, StudyLogService logs, AppDbContext db)
    {
        _gemini = gemini;
        _logs = logs;
        _db = db;
    }

    [HttpGet("status")]
    public async Task<ActionResult<object>> Status()
    {
        var (configured, model, _) = await _gemini.GetConfigAsync();
        return Ok(new { configured, model });
    }

    /// <summary>On-demand AI grading of a sentence (manual button only).</summary>
    [HttpPost("evaluate-sentence")]
    public async Task<ActionResult<object>> Evaluate([FromBody] EvaluateDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.UserInput)) return BadRequest("UserInput is required.");
        string target = string.Empty, context = string.Empty;
        if (dto.DrillId.HasValue)
        {
            var drill = await _db.SentenceDrills.FindAsync(dto.DrillId.Value);
            if (drill is not null) { target = drill.TargetEn; context = drill.PromptVi; }
        }
        try
        {
            var r = await _gemini.EvaluateSentenceAsync(dto.UserInput, target, context, ct);
            await _logs.LogActivityAsync(aiCalls: r.UsedAi ? 1 : 0);
            return Ok(r);
        }
        catch (Exception ex) { return BadRequest(new { error = "AI service error: " + ex.Message }); }
    }

    /// <summary>On-demand AI polish of a rough thought (manual button only).</summary>
    [HttpPost("polish")]
    public async Task<ActionResult<AiPolishResult>> Polish([FromBody] PolishDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.RawInput)) return BadRequest("RawInput is required.");
        try
        {
            var r = await _gemini.PolishAsync(dto.RawInput, ct);
            await _logs.LogActivityAsync(aiCalls: r.UsedAi ? 1 : 0);
            return Ok(r);
        }
        catch (Exception ex) { return BadRequest(new { error = "AI service error: " + ex.Message }); }
    }
}

[ApiController]
[Route("api/typing")]
public class TypingController : ControllerBase
{
    private const int RequiredStreak = 5;
    private readonly AppDbContext _db;
    private readonly StudyLogService _logs;

    public TypingController(AppDbContext db, StudyLogService logs)
    {
        _db = db;
        _logs = logs;
    }

    /// <summary>
    /// Exponential spacing intervals for typing:
    /// Streak 0 -> 1 day
    /// Streak 1 -> 2 days
    /// Streak 2 -> 4 days
    /// Streak 3 -> 7 days (1 week)
    /// Streak 4 -> 14 days (2 weeks)
    /// Streak 5+ -> 30 days (~1 month, checking long-term retention)
    /// </summary>
    public static int GetIntervalDays(int streak) => streak switch
    {
        0 => 1,
        1 => 2,
        2 => 4,
        3 => 7,
        4 => 14,
        _ => 30,
    };

    /// <summary>
    /// Pick a card for typing practice:
    /// Priority 1: Cards currently due based on exponential intervals.
    /// Priority 2: When all due cards are done, rotate cards that had mistakes (MistakeCount > 0) so user can re-practice.
    /// Priority 3: If all correct, rotate random learned cards for unlimited practice without blocking.
    /// mode=mistakes: only cards typed wrong and never typed correctly in a row
    /// (MistakeCount &gt; 0 and ConsecutiveTypingPasses == 0) for focused review.
    /// </summary>
    [HttpGet("next")]
    public async Task<ActionResult<CardDto>> Next([FromQuery] string? category = null, [FromQuery] string? mode = null)
    {
        var today = StudyLogService.TodayUtc();
        var q = _db.VocabCards.Where(c => c.Status == CardStatus.Learning || c.Status == CardStatus.Review || c.Status == CardStatus.Mastered);
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(c => c.Category == category);
        if (string.Equals(mode, "mistakes", StringComparison.OrdinalIgnoreCase))
            q = q.Where(c => c.MistakeCount > 0 && c.ConsecutiveTypingPasses == 0);

        var allCards = await q.ToListAsync();
        if (allCards.Count == 0)
        {
            if (string.Equals(mode, "mistakes", StringComparison.OrdinalIgnoreCase))
                return NotFound(new { error = "Chưa có từ gõ sai nào cần ôn (từ đã gõ sai mà chuỗi đúng đang = 0). Hãy luyện gõ thường, gõ sai vài từ rồi quay lại đây ôn nhé!" });
            return NotFound(new { error = "Chưa có thẻ từ vựng nào trong danh sách học." });
        }

        // Priority 1: Due cards (never typed or interval elapsed)
        var dueCards = allCards.Where(c =>
            c.LastTypingPassDate == null ||
            c.LastTypingPassDate.Value.AddDays(GetIntervalDays(c.ConsecutiveTypingPasses)) <= today
        ).ToList();

        if (dueCards.Count > 0)
        {
            var card = dueCards[Random.Shared.Next(dueCards.Count)];
            return DtoMapper.ToDto(card);
        }

        // Priority 2: Rotate words that had mistakes so user can practice difficult words
        var mistakeCards = allCards.Where(c => c.MistakeCount > 0).OrderByDescending(c => c.MistakeCount).ToList();
        if (mistakeCards.Count > 0)
        {
            var topMistakes = mistakeCards.Take(15).ToList();
            var card = topMistakes[Random.Shared.Next(topMistakes.Count)];
            return DtoMapper.ToDto(card);
        }

        // Priority 3: All correct -> rotate through all cards for free practice
        var pool = allCards.Where(c => c.LastTypingPassDate != today).ToList();
        if (pool.Count == 0) pool = allCards;

        var randomCard = pool[Random.Shared.Next(pool.Count)];
        return DtoMapper.ToDto(randomCard);
    }

    /// <summary>Count of mistake-only cards (typed wrong, current streak = 0).</summary>
    [HttpGet("mistakes/count")]
    public async Task<ActionResult<object>> MistakesCount([FromQuery] string? category = null)
    {
        var q = _db.VocabCards.Where(c =>
            (c.Status == CardStatus.Learning || c.Status == CardStatus.Review || c.Status == CardStatus.Mastered)
            && c.MistakeCount > 0 && c.ConsecutiveTypingPasses == 0);
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(c => c.Category == category);
        return Ok(new { count = await q.CountAsync() });
    }

    /// <summary>
    /// Grade typed input with exponential spacing.
    /// Only genuine due cards on a new day increment the streak (+1).
    /// Rotation / extra practice passes do NOT falsely increment the streak count.
    /// </summary>
    [HttpPost("{id}/submit")]
    public async Task<ActionResult<TypingResultDto>> Submit(int id, [FromBody] TypingSubmitDto dto)
    {
        var card = await _db.VocabCards.FindAsync(id);
        if (card is null) return NotFound();

        string Norm(string s) =>
            System.Text.RegularExpressions.Regex.Replace((s ?? string.Empty).Trim().ToLowerInvariant(), @"\s+", " ");
        string want = Norm(card.Term);
        string got = Norm(dto.UserInput ?? string.Empty);
        double sim = OfflineEvaluator.Similarity(got, want);
        bool passed = got == want || sim >= 0.9;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        bool isDue = card.LastTypingPassDate == null ||
                     card.LastTypingPassDate.Value.AddDays(GetIntervalDays(card.ConsecutiveTypingPasses)) <= today;

        bool counted = false;
        if (passed)
        {
            // Each correct typing reduces the lifetime wrong-count (floor at 0).
            if (card.MistakeCount > 0) card.MistakeCount--;

            // Only advance streak if this card was actually DUE and hasn't passed today yet
            if (isDue && card.LastTypingPassDate != today)
            {
                card.ConsecutiveTypingPasses++;
                card.LastTypingPassDate = today;
                counted = true;
            }
        }
        else
        {
            card.MistakeCount++;
            card.ConsecutiveTypingPasses = 0;
            card.LastTypingPassDate = today;
        }

        bool mastered = false;
        if (card.ConsecutiveTypingPasses >= RequiredStreak)
        {
            card.Status = CardStatus.Mastered;
            mastered = true;
        }

        int intervalDays = GetIntervalDays(card.ConsecutiveTypingPasses);
        card.NextReviewDate = DateTime.UtcNow.AddDays(intervalDays);

        await _db.SaveChangesAsync();
        await _logs.LogActivityAsync(cards: 1);

        return new TypingResultDto(passed, Math.Round(sim, 3), card.Term, card.MeaningVi,
            card.ConsecutiveTypingPasses, RequiredStreak, mastered, counted, intervalDays, card.MistakeCount);
    }
}

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly StudyLogService _logs;
    private readonly SettingsService _settings;

    public DashboardController(AppDbContext db, StudyLogService logs, SettingsService settings)
    {
        _db = db;
        _logs = logs;
        _settings = settings;
    }

    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get()
    {
        var now = DateTime.UtcNow;
        var today = StudyLogService.TodayUtc();
        var cardsDue = await _db.VocabCards.CountAsync(c => c.NextReviewDate <= now);
        var drillsDue = await _db.SentenceDrills.CountAsync(d => d.NextReviewDate <= now);
        var mastered = await _db.VocabCards.CountAsync(c => c.Status == CardStatus.Mastered);
        var total = await _db.VocabCards.CountAsync();
        var streak = await _logs.GetStreakAsync();
        var todayLog = await _db.StudyLogs.FirstOrDefaultAsync(x => x.StudyDate == today);
        var target = await _settings.GetDailyTargetAsync();

        var forecast = new List<ForecastDayDto>();
        for (int i = 0; i < 7; i++)
        {
            var dayStart = now.Date.AddDays(i);
            var dayEnd = dayStart.AddDays(1);
            int count = await _db.VocabCards.CountAsync(c => c.NextReviewDate >= dayStart && c.NextReviewDate < dayEnd);
            forecast.Add(new ForecastDayDto(dayStart.ToString("dd/MM"), count));
        }

        var leeches = await _db.VocabCards
            .Where(c => c.MistakeCount > 0)
            .OrderByDescending(c => c.MistakeCount)
            .Take(10)
            .Select(c => new LeechDto(c.Id, c.Term, c.MeaningVi, c.MistakeCount, c.Category))
            .ToListAsync();

        // GitHub-style contribution heatmap: past 52 weeks aligned to Sunday
        var startDate = today.AddDays(-(int)today.DayOfWeek - 52 * 7);
        var pastLogs = await _db.StudyLogs
            .Where(x => x.StudyDate >= startDate && x.StudyDate <= today)
            .ToDictionaryAsync(x => x.StudyDate, x => x.CardsReviewed + x.DrillsCompleted);

        var heatmap = new List<HeatmapDayDto>();
        int totalLastYear = 0;
        for (var cur = startDate; cur <= today; cur = cur.AddDays(1))
        {
            pastLogs.TryGetValue(cur, out int count);
            heatmap.Add(new HeatmapDayDto(cur.ToString("yyyy-MM-dd"), count));
            totalLastYear += count;
        }

        return new DashboardDto(streak, cardsDue, drillsDue, mastered, total,
            (todayLog?.CardsReviewed ?? 0) + (todayLog?.DrillsCompleted ?? 0),
            target, todayLog?.AiCallsUsed ?? 0, forecast, leeches,
            heatmap, totalLastYear);
    }

    [HttpPost("log-time")]
    public async Task<IActionResult> LogTime([FromBody] LogTimeDto dto)
    {
        await _logs.LogActivityAsync(seconds: Math.Clamp(dto.Seconds, 0, 86400));
        return Ok();
    }

    public record LogTimeDto(int Seconds);
}

[ApiController]
[Route("api/backup")]
public class BackupController : ControllerBase
{
    private readonly AppDbContext _db;
    public BackupController(AppDbContext db) => _db = db;

    [HttpGet("export")]
    public async Task<ActionResult<object>> Export()
    {
        var cards = await _db.VocabCards.OrderBy(c => c.Id).ToListAsync();
        var drills = await _db.SentenceDrills.OrderBy(d => d.Id).ToListAsync();
        return Ok(new { exportedAt = DateTime.UtcNow, cards, drills });
    }

    [HttpPost("import")]
    public async Task<ActionResult<object>> Import([FromBody] BackupPayload payload)
    {
        int cardsAdded = 0, drillsAdded = 0;
        if (payload.Cards is not null)
        {
            foreach (var c in payload.Cards)
            {
                bool exists = !string.IsNullOrWhiteSpace(c.Term) &&
                    await _db.VocabCards.AnyAsync(x => x.Term == c.Term);
                if (exists) continue;
                c.Id = 0;
                _db.VocabCards.Add(c);
                cardsAdded++;
            }
        }
        if (payload.Drills is not null)
        {
            foreach (var d in payload.Drills)
            {
                bool exists = !string.IsNullOrWhiteSpace(d.PromptVi) &&
                    await _db.SentenceDrills.AnyAsync(x => x.PromptVi == d.PromptVi && x.TargetEn == d.TargetEn);
                if (exists) continue;
                d.Id = 0;
                _db.SentenceDrills.Add(d);
                drillsAdded++;
            }
        }
        await _db.SaveChangesAsync();
        return Ok(new { cardsAdded, drillsAdded });
    }

    public record BackupPayload(List<VocabCard>? Cards, List<SentenceDrill>? Drills);
}

[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly SettingsService _settings;
    public SettingsController(SettingsService settings) => _settings = settings;

    [HttpGet]
    public async Task<ActionResult<Dictionary<string, string>>> All()
    {
        var all = await _settings.GetAllAsync();
        if (all.TryGetValue("GeminiApiKey", out var k) && !string.IsNullOrEmpty(k))
            all["GeminiApiKey"] = "***" + k[^Math.Min(4, k.Length)..];
        return all;
    }

    [HttpPut]
    public async Task<IActionResult> Save([FromBody] Dictionary<string, string> values)
    {
        foreach (var (k, v) in values)
        {
            if (k == "GeminiApiKey" && v.StartsWith("***")) continue; // masked, unchanged
            await _settings.SetAsync(k, v ?? string.Empty);
        }
        return Ok();
    }
}
