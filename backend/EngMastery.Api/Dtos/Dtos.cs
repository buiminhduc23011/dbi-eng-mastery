using EngMastery.Api.Models;
using System.Text.Json;

namespace EngMastery.Api.Dtos;

public record CardDto(
    int Id, string Term, string Phonetic, string PartOfSpeech, string MeaningVi,
    string DefinitionEn, string ExampleSentence, string ClozeSentence, string ClozeHint,
    string Category, int Repetition, int IntervalDays, double EaseFactor,
    DateTime NextReviewDate, int MistakeCount, DateTime? LastReviewedAt, string Status,
    int ConsecutiveTypingPasses);

public record UpsertCardDto(
    string Term, string Phonetic, string PartOfSpeech, string MeaningVi,
    string DefinitionEn, string ExampleSentence, string ClozeSentence, string ClozeHint,
    string Category);

public record ReviewDto(int Quality);

public record TypingSubmitDto(string UserInput);

public record TypingResultDto(
    bool Passed,
    double Similarity,
    string CorrectTerm,
    string MeaningVi,
    int Streak,
    int RequiredStreak,
    bool Mastered,
    bool CountedToday,
    int NextIntervalDays);

public record DrillDto(
    int Id, string Category, string PromptVi, string TargetEn,
    List<string> AlternativesEn, List<string> Keywords, string GrammarNote,
    int PracticeCount, int LastScore, DateTime NextReviewDate);

public record SubmitDrillDto(string UserInput);

public record DrillResultDto(
    int Score, int KeywordsMatched, int KeywordsTotal, double Similarity,
    List<string> MatchedWords, List<string> MissedWords,
    string TargetEn, List<string> AlternativesEn, string GrammarNote);

public record HeatmapDayDto(string Date, int Count);

public record DashboardDto(
    int Streak, int CardsDue, int DrillsDue, int MasteredCount, int TotalCards,
    int TodayReviewed, int DailyTarget, int AiCallsToday,
    List<ForecastDayDto> Forecast, List<LeechDto> Leeches,
    List<HeatmapDayDto> Heatmap, int TotalReviewedLastYear);

public record ForecastDayDto(string Date, int Count);
public record LeechDto(int Id, string Term, string MeaningVi, int MistakeCount, string Category);

public record EvaluateDto(string UserInput, int? DrillId);
public record PolishDto(string RawInput);

public static class DtoMapper
{
    public static CardDto ToDto(VocabCard c) => new(
        c.Id, c.Term, c.Phonetic, c.PartOfSpeech, c.MeaningVi, c.DefinitionEn,
        c.ExampleSentence, c.ClozeSentence, c.ClozeHint, c.Category,
        c.Repetition, c.IntervalDays, c.EaseFactor, c.NextReviewDate,
        c.MistakeCount, c.LastReviewedAt, c.Status.ToString(), c.ConsecutiveTypingPasses);

    public static void ApplyUpsert(VocabCard c, UpsertCardDto d)
    {
        c.Term = d.Term.Trim();
        c.Phonetic = d.Phonetic ?? string.Empty;
        c.PartOfSpeech = d.PartOfSpeech ?? string.Empty;
        c.MeaningVi = d.MeaningVi ?? string.Empty;
        c.DefinitionEn = d.DefinitionEn ?? string.Empty;
        c.ExampleSentence = d.ExampleSentence ?? string.Empty;
        c.ClozeSentence = string.IsNullOrWhiteSpace(d.ClozeSentence) && !string.IsNullOrWhiteSpace(d.ExampleSentence)
            ? AutoCloze(d.ExampleSentence, d.Term)
            : (d.ClozeSentence ?? string.Empty);
        c.ClozeHint = d.ClozeHint ?? string.Empty;
        c.Category = string.IsNullOrWhiteSpace(d.Category) ? "Daily & Casual" : d.Category;
    }

    public static string AutoCloze(string sentence, string term)
    {
        if (string.IsNullOrWhiteSpace(sentence) || string.IsNullOrWhiteSpace(term)) return sentence;
        int idx = sentence.IndexOf(term, StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
        {
            var firstWord = term.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? term;
            idx = sentence.IndexOf(firstWord, StringComparison.OrdinalIgnoreCase);
            if (idx < 0) return sentence;
            return sentence[..idx] + new string('_', firstWord.Length) + sentence[(idx + firstWord.Length)..];
        }
        return sentence[..idx] + new string('_', term.Length) + sentence[(idx + term.Length)..];
    }

    public static List<string> FromJson(string json)
    {
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? new(); }
        catch { return new(); }
    }

    public static DrillDto ToDto(SentenceDrill d) => new(
        d.Id, d.Category, d.PromptVi, d.TargetEn,
        FromJson(d.AlternativesEnJson), FromJson(d.KeywordsJson), d.GrammarNote,
        d.PracticeCount, d.LastScore, d.NextReviewDate);
}
