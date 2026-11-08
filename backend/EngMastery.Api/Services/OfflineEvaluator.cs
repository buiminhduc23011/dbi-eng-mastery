using System.Text.RegularExpressions;

namespace EngMastery.Api.Services;

public record DrillScore(
    int Score,
    int KeywordsMatched,
    int KeywordsTotal,
    double Similarity,
    List<string> MatchedWords,
    List<string> MissedWords);

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
}
