using EngMastery.Api.Data;
using EngMastery.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EngMastery.Api.Services;

public class SettingsService
{
    private readonly AppDbContext _db;
    public SettingsService(AppDbContext db) => _db = db;

    public async Task<string?> GetAsync(string key) =>
        (await _db.AppSettings.FindAsync(key))?.Value;

    public async Task SetAsync(string key, string value)
    {
        var s = await _db.AppSettings.FindAsync(key);
        if (s is null) _db.AppSettings.Add(new AppSetting { Key = key, Value = value });
        else s.Value = value;
        await _db.SaveChangesAsync();
    }

    public async Task<Dictionary<string, string>> GetAllAsync() =>
        await _db.AppSettings.ToDictionaryAsync(x => x.Key, x => x.Value);

    public async Task<int> GetDailyTargetAsync()
    {
        var v = await GetAsync("DailyTarget");
        return int.TryParse(v, out int n) && n > 0 ? n : 20;
    }
}

public class StudyLogService
{
    private readonly AppDbContext _db;
    public StudyLogService(AppDbContext db) => _db = db;

    public static DateOnly TodayUtc() => DateOnly.FromDateTime(DateTime.UtcNow);

    public async Task<StudyLog> GetTodayAsync()
    {
        var today = TodayUtc();
        var log = await _db.StudyLogs.FirstOrDefaultAsync(x => x.StudyDate == today);
        if (log is null)
        {
            log = new StudyLog { StudyDate = today };
            _db.StudyLogs.Add(log);
            await _db.SaveChangesAsync();
        }
        return log;
    }

    public async Task LogActivityAsync(int cards = 0, int drills = 0, int aiCalls = 0, int seconds = 0)
    {
        var log = await GetTodayAsync();
        log.CardsReviewed += cards;
        log.DrillsCompleted += drills;
        log.AiCallsUsed += aiCalls;
        log.StudyDurationSeconds += seconds;
        await _db.SaveChangesAsync();
    }

    public async Task<int> GetStreakAsync()
    {
        int streak = 0;
        var day = TodayUtc();
        var dates = await _db.StudyLogs
            .Where(x => x.CardsReviewed + x.DrillsCompleted > 0)
            .Select(x => x.StudyDate)
            .OrderByDescending(x => x)
            .Take(400)
            .ToListAsync();
        var set = new HashSet<DateOnly>(dates);
        // Streak counts back from today (or yesterday if today has no activity yet).
        if (!set.Contains(day)) day = day.AddDays(-1);
        while (set.Contains(day)) { streak++; day = day.AddDays(-1); }
        return streak;
    }
}
