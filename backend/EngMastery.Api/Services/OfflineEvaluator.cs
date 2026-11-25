using System.Text.Json;
using System.Text.RegularExpressions;

namespace EngMastery.Api.Services;

public record DrillScore(
    int Score,
    int KeywordsMatched,
    int KeywordsTotal,
    double Similarity,
    List<string> MatchedWords,
    List<string> MissedWords);

/// <summary>Result of grading a typed answer against a target term plus its accepted paraphrases.</summary>
public record TypingMatch(
    bool Passed,
    bool MatchedAlternative,
    string? Alternative,
    double Similarity);

/// <summary>
/// Zero-AI-cost offline grading: token matching + Levenshtein similarity.
/// </summary>
public static partial class OfflineEvaluator
{
    private static readonly HashSet<string> Stopwords = new(StringComparer.OrdinalIgnoreCase)
    {
        "a","an","the","is","are","was","were","be","been","being","to","of","in","on","at",
        "for","with","and","or","but","so","as","by","it","its","this","that","these","those",
        "i","you","he","she","we","they","my","your","our","their","me","him","her","us","them",
        "do","does","did","have","has","had","will","would","can","could","should","must",
        "not","no","yes","please","very","just","really","up","out","about","into","over",
        "after","before","between","during","again","once","here","there","when","where",
        "what","which","who","whom","how","why","if","then","than","too","also"
    };

    public static List<string> Tokenize(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return new List<string>();
        return TokenRegex()
            .Matches(text.ToLowerInvariant())
            .Select(m => m.Value)
            .Where(t => t.Length > 0)
            .ToList();
    }

    public static List<string> ContentTokens(string text) =>
        Tokenize(text).Where(t => !Stopwords.Contains(t)).ToList();

    /// <summary>Weighted random sample without replacement (weight 0 = skipped unless all weights are 0).</summary>
    public static List<T> WeightedSample<T>(IList<T> items, Func<T, double> weight, int count)
    {
        var remaining = items.ToList();
        var result = new List<T>();
        while (result.Count < count && remaining.Count > 0)
        {
            double total = remaining.Sum(x => Math.Max(0, weight(x)));
            T chosen;
            if (total <= 0)
            {
                chosen = remaining[Random.Shared.Next(remaining.Count)];
            }
            else
            {
                double r = Random.Shared.NextDouble() * total;
                chosen = remaining[^1];
                foreach (var x in remaining)
                {
                    r -= Math.Max(0, weight(x));
                    if (r <= 0) { chosen = x; break; }
                }
            }
            result.Add(chosen);
            remaining.Remove(chosen);
        }
        return result;
    }

    /// <summary>Weighted random pick: higher-weight items appear more often (e.g. weight = 1 + MistakeCount).</summary>
    public static T WeightedPick<T>(IList<T> items, Func<T, double> weight) =>
        WeightedSample(items, weight, 1).FirstOrDefault() ?? items[Random.Shared.Next(items.Count)];

    /// <summary>
    /// Normalize typed input and stored terms for fair comparison:
    /// - case-insensitive, trim, collapse whitespace
    /// - placeholder "..." / "…" ignored (e.g. "How do you say...?" == "how do you say")
    /// - punctuation ? ! . , : ; " ( ) - / ignored
    /// - apostrophes removed without splitting (how's == hows) so missing ' is not penalized
    /// </summary>
    public static string NormalizeTyping(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return string.Empty;
        s = s.Trim().ToLowerInvariant();
        s = s.Replace("…", " ");
        // Don't split words on apostrophes: how's / how’d -> hows / howd
        s = s.Replace("’", string.Empty).Replace("‘", string.Empty).Replace("'", string.Empty);
        s = NonAlphaNumRegex().Replace(s, " ");
        s = WhitespaceRegex().Replace(s, " ").Trim();
        return s;
    }

    public static int Levenshtein(string a, string b)
    {
        if (a == b) return 0;
        if (a.Length == 0) return b.Length;
        if (b.Length == 0) return a.Length;
        var d = new int[a.Length + 1, b.Length + 1];
        for (int i = 0; i <= a.Length; i++) d[i, 0] = i;
        for (int j = 0; j <= b.Length; j++) d[0, j] = j;
        for (int i = 1; i <= a.Length; i++)
            for (int j = 1; j <= b.Length; j++)
                d[i, j] = Math.Min(Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1));
        return d[a.Length, b.Length];
    }

    public static double Similarity(string a, string b)
    {
        a = (a ?? string.Empty).Trim().ToLowerInvariant();
        b = (b ?? string.Empty).Trim().ToLowerInvariant();
        if (a == b) return 1.0;
        if (a.Length == 0 || b.Length == 0) return 0.0;
        int dist = Levenshtein(a, b);
        return 1.0 - (double)dist / Math.Max(a.Length, b.Length);
    }

    /// <summary>Minimum similarity for a typed answer to count as correct.</summary>
    public const double TypingPassThreshold = 0.9;

    /// <summary>Reads a JSON string array (e.g. accepted paraphrases), tolerating legacy/empty values.</summary>
    public static List<string> ParseTermList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json == "[]") return new List<string>();
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json)?
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .ToList() ?? new List<string>();
        }
        catch (JsonException)
        {
            return new List<string>();
        }
    }

    /// <summary>
    /// Grade a typed term. Exact target (fuzzy ≥ 0.9) is a pass; a paraphrase from
    /// <paramref name="alternatives"/> is a "near miss" — right meaning, wrong target phrase.
    /// </summary>
    public static TypingMatch MatchTyping(string? userInput, string target, IEnumerable<string>? alternatives = null)
    {
        string got = NormalizeTyping(userInput);
        string want = NormalizeTyping(target);
        if (got.Length == 0 || want.Length == 0) return new TypingMatch(false, false, null, 0);

        double targetSim = Similarity(got, want);
        if (targetSim >= TypingPassThreshold) return new TypingMatch(true, false, null, targetSim);

        TypingMatch? bestAlt = null;
        foreach (var alt in alternatives ?? Enumerable.Empty<string>())
        {
            string normAlt = NormalizeTyping(alt);
            if (normAlt.Length == 0) continue;
            double sim = Similarity(got, normAlt);
            if (sim < TypingPassThreshold) continue;
            if (bestAlt is null || sim > bestAlt.Similarity)
                bestAlt = new TypingMatch(false, true, alt, sim);
        }

        return bestAlt ?? new TypingMatch(false, false, null, targetSim);
    }

    private static bool TokenMatch(string userToken, string refToken)
    {
        if (userToken == refToken) return true;
        if (Math.Abs(userToken.Length - refToken.Length) > 2) return false;
        return Similarity(userToken, refToken) >= 0.8;
    }

    public static DrillScore ScoreDrill(string userInput, string targetEn, IEnumerable<string> alternatives, IEnumerable<string> keywords)
    {
        var userTokens = ContentTokens(userInput);
        var userSet = new HashSet<string>(userTokens);
        var keywordList = keywords
            .SelectMany(k => Tokenize(k))
            .Where(t => !Stopwords.Contains(t) || true)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        int kwTotal = keywordList.Count;
        int kwMatched = keywordList.Count(k =>
            userSet.Contains(k, StringComparer.OrdinalIgnoreCase) ||
            userTokens.Any(u => TokenMatch(u, k)));

        double targetSim = Similarity(userInput ?? string.Empty, targetEn ?? string.Empty);
        double bestAltSim = 0;
        string bestRef = targetEn ?? string.Empty;
        foreach (var alt in alternatives ?? Enumerable.Empty<string>())
        {
            double s = Similarity(userInput ?? string.Empty, alt ?? string.Empty);
            if (s > bestAltSim) { bestAltSim = s; bestRef = alt ?? string.Empty; }
        }
        double sim = Math.Max(targetSim, bestAltSim);

        double kwRatio = kwTotal == 0 ? 1.0 : (double)kwMatched / kwTotal;
        int score = (int)Math.Round(Math.Min(1.0, 0.55 * kwRatio + 0.45 * sim) * 100);

        var refContent = ContentTokens(bestRef);
        var matched = new List<string>();
        var missed = new List<string>();
        foreach (var t in refContent.Distinct())
        {
            if (userSet.Contains(t, StringComparer.OrdinalIgnoreCase) || userTokens.Any(u => TokenMatch(u, t)))
                matched.Add(t);
            else
                missed.Add(t);
        }

        return new DrillScore(score, kwMatched, kwTotal, Math.Round(sim, 3), matched, missed);
    }

    /// <summary>Suggest an SRS button rating (1-4) from typing accuracy 0-1.</summary>
    public static int SuggestRating(double accuracy) => accuracy switch
    {
        < 0.6 => 1,   // Again
        < 0.8 => 2,   // Hard
        < 0.95 => 3,  // Good
        _ => 4,       // Easy
    };

    [GeneratedRegex(@"[a-z0-9']+", RegexOptions.Compiled)]
    private static partial Regex TokenRegex();

    [GeneratedRegex(@"[^\p{L}\p{N}]+", RegexOptions.Compiled)]
    private static partial Regex NonAlphaNumRegex();

    [GeneratedRegex(@"\s+", RegexOptions.Compiled)]
    private static partial Regex WhitespaceRegex();
}
