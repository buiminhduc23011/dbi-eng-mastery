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

    /// <summary>Offline grading: no AI cost. Weak drills take ~40% of slots (weighted by
    /// how bad the score is) but due drills still flow through instead of being blocked.</summary>
    [HttpGet("due")]
    public async Task<ActionResult<List<DrillDto>>> Due([FromQuery] int take = 20)
    {
        int limit = Math.Clamp(take, 1, 100);
        var weakDrills = await _db.SentenceDrills
            .Where(d => d.PracticeCount > 0 && d.LastScore < 80)
            .OrderBy(d => d.LastScore)
            .ThenByDescending(d => d.PracticeCount)
            .Take(limit)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var dueDrills = await _db.SentenceDrills
            .Where(d => d.NextReviewDate <= now)
            .OrderBy(d => d.NextReviewDate)
            .Take(limit)
            .ToListAsync();

        var picked = new List<SentenceDrill>();
        var pickedIds = new HashSet<int>();
        void Add(SentenceDrill d) { if (pickedIds.Add(d.Id)) picked.Add(d); }

        int weakSlots = weakDrills.Count == 0 || dueDrills.Count == 0
            ? weakDrills.Count
            : Math.Max(1, (int)Math.Round(limit * 0.4));
        foreach (var d in OfflineEvaluator.WeightedSample(
                     weakDrills, d => (80 - d.LastScore) + d.PracticeCount, Math.Min(weakSlots, weakDrills.Count)))
            Add(d);
        foreach (var d in dueDrills.OrderBy(_ => Random.Shared.Next()))
        {
            if (picked.Count >= limit) break;
            Add(d);
        }
        // Backfill with remaining weak drills if due drills ran short.
        foreach (var d in weakDrills)
        {
            if (picked.Count >= limit) break;
            Add(d);
        }
        return picked.OrderBy(_ => Random.Shared.Next()).Select(DtoMapper.ToDto).ToList();
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

    /// <summary>Current Gemini text models, fetched live from Google when a key is saved.</summary>
    [HttpGet("models")]
    public async Task<ActionResult<object>> Models(CancellationToken ct)
    {
        var (configured, current, _) = await _gemini.GetConfigAsync();
        var (fromApi, models) = await _gemini.ListModelsAsync(ct);
        return Ok(new
        {
            configured,
            current,
            fromApi,
            models,
            currentRetired = GeminiService.RetiredModels.Contains(current),
        });
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

    /// <summary>
    /// Retry budget by reflex level (streak at the start of the day's first attempt):
    /// level 0–1 → 3 attempts, level 2 → 2 attempts, level 3+ → a single shot.
    /// </summary>
    private static int MaxAttemptsForLevel(int level) => level switch
    {
        <= 1 => 3,
        2 => 2,
        _ => 1,
    };

    /// <summary>True once the card has burned today's attempt budget — hide it until tomorrow.</summary>
    private static bool ExhaustedToday(VocabCard card, DateOnly today) =>
        card.LastFailedTypingDate == today && card.SameDayAttemptCap > 0 &&
        card.SameDayTypingAttempts >= card.SameDayAttemptCap;

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
    /// Pick a card for typing practice (weighted random):
    /// - Mistake-prone cards (MistakeCount &gt; 0) are boosted to ~35% of picks, weighted by MistakeCount —
    ///   they show up more often but no longer block all other cards.
    /// - Otherwise serve due cards (interval elapsed), or rotate random learned cards for free practice.
    /// - mode=mistakes stays strict: only mistake cards (explicit review tab).
    /// - exclude=1,2,3 skips cards the client is already holding back to re-ask after a gap.
    /// - Cards that burned today's attempt budget are hidden until tomorrow.
    /// </summary>
    [HttpGet("next")]
    public async Task<ActionResult<CardDto>> Next(
        [FromQuery] string? category = null,
        [FromQuery] string? mode = null,
        [FromQuery] string? exclude = null)
    {
        bool mistakesOnly = string.Equals(mode, "mistakes", StringComparison.OrdinalIgnoreCase);
        var today = StudyLogService.TodayUtc();
        var q = _db.VocabCards.Where(c =>
            c.MistakeCount > 0 || c.Status == CardStatus.Learning || c.Status == CardStatus.Review || c.Status == CardStatus.Mastered);
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(c => c.Category == category);
        if (mistakesOnly)
            q = q.Where(c => c.MistakeCount > 0);

        if (!string.IsNullOrWhiteSpace(exclude))
        {
            var excludeIds = exclude
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0)
                .Where(id => id > 0)
                .ToHashSet();
            if (excludeIds.Count > 0) q = q.Where(c => !excludeIds.Contains(c.Id));
        }

        var allCards = (await q.ToListAsync())
            .Where(c => !ExhaustedToday(c, today))
            .ToList();
        if (allCards.Count == 0)
        {
            if (mistakesOnly)
                return NotFound(new { error = "Không còn từ gõ sai nào cần ôn! Tuyệt vời!" });
            return NotFound(new { error = "Chưa có thẻ từ vựng nào trong danh sách học." });
        }

        if (mistakesOnly)
            return DtoMapper.ToDto(OfflineEvaluator.WeightedPick(allCards, c => 1 + c.MistakeCount));

        // Weighted random: mistake cards boosted (~35%) but due/new cards still flow through.
        var mistakeCards = allCards.Where(c => c.MistakeCount > 0).ToList();
        if (mistakeCards.Count > 0 && Random.Shared.NextDouble() < 0.35)
            return DtoMapper.ToDto(OfflineEvaluator.WeightedPick(mistakeCards, c => 1 + c.MistakeCount));

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

        // Priority 2: All correct -> rotate through all cards for free practice
        var pool = allCards.Where(c => c.LastTypingPassDate != today).ToList();
        if (pool.Count == 0) pool = allCards;

        var randomCard = pool[Random.Shared.Next(pool.Count)];
        return DtoMapper.ToDto(randomCard);
    }

    /// <summary>Count of mistake-only cards (MistakeCount &gt; 0) that haven't burned today's attempts.</summary>
    [HttpGet("mistakes/count")]
    public async Task<ActionResult<object>> MistakesCount([FromQuery] string? category = null)
    {
        var today = StudyLogService.TodayUtc();
        var q = _db.VocabCards.Where(c => c.MistakeCount > 0);
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(c => c.Category == category);
        var cards = await q.ToListAsync();
        return Ok(new { count = cards.Count(c => !ExhaustedToday(c, today)) });
    }

    /// <summary>
    /// Grade typed input with exponential spacing.
    /// - Exact target term (fuzzy) = pass; only a genuinely due card on a new day increments the streak (+1).
    /// - Accepted paraphrase (card.AltTermsJson) = "near miss": right meaning, wrong target phrase.
    ///   It is not penalised (no mistake, streak kept) but it never advances the streak.
    /// - The day's attempt budget depends on the card's reflex level when the first miss happens
    ///   (3 at level 0–1, 2 at level 2, 1 at level 3+). The failed card is re-queued by the client
    ///   after a few other cards, so the answer is not on screen while retyping.
    ///   A mid-retry miss keeps the level; spending the whole budget without passing drops it to 0.
    ///   Only the first attempt of the day can advance the streak.
    /// </summary>
    [HttpPost("{id}/submit")]
    public async Task<ActionResult<TypingResultDto>> Submit(int id, [FromBody] TypingSubmitDto dto)
    {
        var card = await _db.VocabCards.FindAsync(id);
        if (card is null) return NotFound();

        var match = OfflineEvaluator.MatchTyping(
            dto.UserInput, card.Term, OfflineEvaluator.ParseTermList(card.AltTermsJson));
        bool passed = match.Passed;
        bool nearMiss = match.MatchedAlternative;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        bool isDue = card.LastTypingPassDate == null ||
                     card.LastTypingPassDate.Value.AddDays(GetIntervalDays(card.ConsecutiveTypingPasses)) <= today;

        // Attempts that did not pass earlier today (reset on a new day or after a pass).
        int attemptsToday = card.LastFailedTypingDate == today ? card.SameDayTypingAttempts : 0;
        // Freeze the day's budget on the first miss so a later attempt still uses the same cap
        // (needed once the final miss drops the streak to 0, and for legacy rows without a cap).
        int dailyCap = card.LastFailedTypingDate == today && card.SameDayAttemptCap > 0
            ? card.SameDayAttemptCap
            : MaxAttemptsForLevel(card.ConsecutiveTypingPasses);
        bool retried = attemptsToday > 0;

        bool counted = false;
        if (passed)
        {
            // Each correct typing reduces the lifetime wrong-count (floor at 0).
            if (card.MistakeCount > 0) card.MistakeCount--;

            // Only the first attempt of the day, on a card that was actually due, advances the streak.
            if (isDue && card.LastTypingPassDate != today && attemptsToday == 0)
            {
                card.ConsecutiveTypingPasses++;
                counted = true;
            }
            card.LastTypingPassDate = today;
            card.SameDayTypingAttempts = 0;
            card.SameDayAttemptCap = 0;
            card.LastFailedTypingDate = null;
        }
        else
        {
            // Near miss = right meaning, wrong phrase: count the attempt but keep the streak.
            if (!nearMiss)
            {
                card.MistakeCount++;
                // Leave today's random queue (the client re-queues it after a gap via /cards/{id}),
                // so a hard fail is not re-served immediately by /typing/next.
                card.LastTypingPassDate = today;
            }
            if (attemptsToday == 0) card.SameDayAttemptCap = dailyCap;
            card.SameDayTypingAttempts = attemptsToday + 1;
            card.LastFailedTypingDate = today;
            // The reflex level survives mid-day retries; only burning the whole budget drops it to 0.
            if (!nearMiss && card.SameDayTypingAttempts >= dailyCap)
                card.ConsecutiveTypingPasses = 0;
        }

        bool mastered = false;
        if (card.ConsecutiveTypingPasses >= RequiredStreak)
        {
            card.Status = CardStatus.Mastered;
            mastered = true;
        }

        int intervalDays = GetIntervalDays(card.ConsecutiveTypingPasses);
        int attemptsUsedToday = card.SameDayTypingAttempts;
        int remainingRetries = passed ? 0 : Math.Max(0, dailyCap - attemptsUsedToday);
        bool retryAllowed = !passed && remainingRetries > 0;

        // A near miss does not move the schedule: the card stays in today's queue for the retry.
        if (passed || !nearMiss)
            card.NextReviewDate = DateTime.UtcNow.AddDays(intervalDays);

        await _db.SaveChangesAsync();
        // Retries in the same session are the same card, so only the first attempt counts toward the daily log.
        if (!retried) await _logs.LogActivityAsync(cards: 1);

        return new TypingResultDto(passed, Math.Round(match.Similarity, 3), card.Term, card.MeaningVi,
            card.ConsecutiveTypingPasses, RequiredStreak, mastered, counted, intervalDays, card.MistakeCount,
            nearMiss, match.Alternative, retryAllowed, remainingRetries, retried);
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
