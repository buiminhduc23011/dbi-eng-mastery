namespace EngMastery.Api.Models;

public enum CardStatus
{
    New = 0,
    Learning = 1,
    Review = 2,
    Mastered = 3
}

public class VocabCard
{
    public int Id { get; set; }
    public string Term { get; set; } = string.Empty;
    public string Phonetic { get; set; } = string.Empty;
    public string PartOfSpeech { get; set; } = string.Empty;
    public string MeaningVi { get; set; } = string.Empty;
    public string DefinitionEn { get; set; } = string.Empty;
    public string ExampleSentence { get; set; } = string.Empty;
    public string ClozeSentence { get; set; } = string.Empty;
    public string ClozeHint { get; set; } = string.Empty;
    public string Category { get; set; } = "Daily & Casual";

    /// <summary>
    /// Accepted paraphrases for typing practice (JSON array). A match counts as "right meaning,
    /// wrong target phrase" (near miss): it is never penalised, but it does not advance the streak.
    /// </summary>
    public string AltTermsJson { get; set; } = "[]";

    // SM-2 fields
    public int Repetition { get; set; } = 0;
    public int IntervalDays { get; set; } = 0;
    public double EaseFactor { get; set; } = 2.5;
    public DateTime NextReviewDate { get; set; } = DateTime.UtcNow;
    public int MistakeCount { get; set; } = 0;
    public DateTime? LastReviewedAt { get; set; }
    public CardStatus Status { get; set; } = CardStatus.New;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Typing-practice: pass 5 consecutive times on different days => Mastered.
    public int ConsecutiveTypingPasses { get; set; } = 0;
    public DateOnly? LastTypingPassDate { get; set; }

    // Typing-practice retry cap: attempts that did not pass (wrong or near miss) today.
    public DateOnly? LastFailedTypingDate { get; set; }
    public int SameDayTypingAttempts { get; set; } = 0;
}

public class SentenceDrill
{
    public int Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string PromptVi { get; set; } = string.Empty;
    public string TargetEn { get; set; } = string.Empty;
    public string AlternativesEnJson { get; set; } = "[]";
    public string KeywordsJson { get; set; } = "[]";
    public string GrammarNote { get; set; } = string.Empty;
    public int PracticeCount { get; set; } = 0;
    public int LastScore { get; set; } = 0;
    public DateTime NextReviewDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class StudyLog
{
    public int Id { get; set; }
    public DateOnly StudyDate { get; set; }
    public int CardsReviewed { get; set; } = 0;
    public int DrillsCompleted { get; set; } = 0;
    public int AiCallsUsed { get; set; } = 0;
    public int StudyDurationSeconds { get; set; } = 0;
}

public class AppSetting
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
