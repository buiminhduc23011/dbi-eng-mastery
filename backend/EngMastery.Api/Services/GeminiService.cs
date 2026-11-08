using System.Text;
using System.Text.Json;

namespace EngMastery.Api.Services;

public record AiSentenceResult(
    string Corrected,
    int GrammarScore,
    int NaturalnessScore,
    string Feedback,
    List<string> CasualVersions,
    List<string> ProfessionalVersions,
    bool UsedAi);

public record AiPolishResult(
    string BusinessEnglish,
    string CasualEnglish,
    List<AiVocabItem> Vocabulary,
    bool UsedAi);

public record AiVocabItem(
    string Term,
    string MeaningVi,
    string ExampleSentence);

public class GeminiService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly SettingsService _settings;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(IHttpClientFactory httpFactory, SettingsService settings, ILogger<GeminiService> logger)
    {
        _httpFactory = httpFactory;
        _settings = settings;
        _logger = logger;
    }

    public async Task<(bool Configured, string Model, string ApiKey)> GetConfigAsync()
    {
        var key = (await _settings.GetAsync("GeminiApiKey")) ?? string.Empty;
        var model = await _settings.GetAsync("GeminiModel") ?? "gemini-2.5-flash";
        return (!string.IsNullOrWhiteSpace(key), model, key);
    }

    public async Task<AiSentenceResult> EvaluateSentenceAsync(string userEn, string targetEn, string contextVi, CancellationToken ct = default)
    {
        var (configured, model, key) = await GetConfigAsync();
        if (!configured)
        {
            // No AI key: offline fallback scored against the reference sentence.
            var s = OfflineEvaluator.ScoreDrill(userEn, targetEn ?? string.Empty,
                Array.Empty<string>(), Array.Empty<string>());
            string corrected = string.IsNullOrWhiteSpace(targetEn) || s.Score >= 95 ? userEn : targetEn;
            return new AiSentenceResult(corrected, s.Score, s.Score,
                "Chưa cấu hình AI key nên đây là chấm offline (từ khóa + độ giống câu). Vào Settings để thêm Gemini key cho nhận xét chi tiết.",
                new List<string>(), new List<string>(), false);
        }

        string prompt = $$"""
            You are an English coach for a Vietnamese software/automation engineer.
            User's sentence: "{{userEn}}"
            Reference native sentence: "{{targetEn}}"
            Vietnamese context: "{{contextVi}}"
            Return ONLY valid JSON (no markdown fences) with keys:
            {"corrected": "<best corrected sentence>", "grammarScore": 0-100, "naturalnessScore": 0-100,
              "feedback": "<2-3 concise sentences, may include Vietnamese>", 
              "casualVersions": ["<v1>", "<v2>"], "professionalVersions": ["<v1>", "<v2>"]}
            """;
        var json = await GenerateAsync(model, key, prompt, ct);
        var doc = JsonDocument.Parse(StripFences(json));
        var r = doc.RootElement;
        return new AiSentenceResult(
            r.GetProperty("corrected").GetString() ?? targetEn,
            r.GetProperty("grammarScore").GetInt32(),
            r.GetProperty("naturalnessScore").GetInt32(),
            r.GetProperty("feedback").GetString() ?? string.Empty,
            r.GetProperty("casualVersions").EnumerateArray().Select(x => x.GetString() ?? "").ToList(),
            r.GetProperty("professionalVersions").EnumerateArray().Select(x => x.GetString() ?? "").ToList(),
            true);
    }

    public async Task<AiPolishResult> PolishAsync(string rawInput, CancellationToken ct = default)
    {
        var (configured, model, key) = await GetConfigAsync();
        if (!configured) return await FreePolishAsync(rawInput, ct);

        string prompt = $$"""
            You are an English coach for a Vietnamese engineer. The user wrote: "{{rawInput}}"
            (It may be Vietnamese, broken English, or a mix.)
            Return ONLY valid JSON (no markdown fences) with keys:
            {"businessEnglish": "<professional workplace version>", "casualEnglish": "<friendly casual version>",
              "vocabulary": [{"term": "<key word/phrase>", "meaningVi": "<nghĩa tiếng Việt>", "exampleSentence": "<short example>"}]}
            Include 3-5 vocabulary items max.
            """;
        var json = await GenerateAsync(model, key, prompt, ct);
        var doc = JsonDocument.Parse(StripFences(json));
        var r = doc.RootElement;
        var vocab = r.GetProperty("vocabulary").EnumerateArray()
            .Select(v => new AiVocabItem(
                v.GetProperty("term").GetString() ?? "",
                v.GetProperty("meaningVi").GetString() ?? "",
                v.GetProperty("exampleSentence").GetString() ?? ""))
            .ToList();
        return new AiPolishResult(
            r.GetProperty("businessEnglish").GetString() ?? rawInput,
            r.GetProperty("casualEnglish").GetString() ?? rawInput,
            vocab,
            true);
    }

    /// <summary>
    /// Free fallback when no Gemini key is configured: Google Translate (no key)
    /// for the translation + keyword meanings extracted offline.
    /// </summary>
    public async Task<AiPolishResult> FreePolishAsync(string rawInput, CancellationToken ct = default)
    {
        string en = await FreeTranslateAsync(rawInput, "en", ct);
        if (string.IsNullOrWhiteSpace(en)) en = rawInput;
        var keywords = OfflineEvaluator.ContentTokens(en)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(w => w.Length)
            .Take(5)
            .ToList();
        var tasks = keywords.Select(async w =>
        {
            string vi = w;
            try { vi = await FreeTranslateAsync(w, "vi", ct); } catch { /* keep raw word */ }
            if (string.IsNullOrWhiteSpace(vi)) vi = w;
            return new AiVocabItem(w, vi, en);
        });
        var vocab = (await Task.WhenAll(tasks)).ToList();
        return new AiPolishResult(en, en, vocab, false);
    }

    public async Task<string> FreeTranslateAsync(string text, string targetLang, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        // Primary: Google free endpoint (occasionally 429s by IP -> retry with backoff).
        for (int attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                return await GoogleTranslateAsync(text, targetLang, ct);
            }
            catch (HttpRequestException ex) when (attempt < 2 && IsTransient(ex))
            {
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt + 1)), ct);
            }
        }
        // Secondary: MyMemory free API.
        return await MyMemoryTranslateAsync(text, targetLang, ct);
    }

    private static bool IsTransient(HttpRequestException ex) =>
        ex.StatusCode is System.Net.HttpStatusCode.TooManyRequests
            or System.Net.HttpStatusCode.InternalServerError
            or System.Net.HttpStatusCode.BadGateway
            or System.Net.HttpStatusCode.ServiceUnavailable
            or System.Net.HttpStatusCode.GatewayTimeout;

    private async Task<string> GoogleTranslateAsync(string text, string targetLang, CancellationToken ct)
    {
        var client = _httpFactory.CreateClient("gemini");
        string url = $"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={targetLang}&dt=t&q={Uri.EscapeDataString(text)}";
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        using var resp = await client.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        var sb = new StringBuilder();
        foreach (var part in doc.RootElement[0].EnumerateArray())
        {
            var t = part[0].GetString();
            if (t is not null) sb.Append(t);
        }
        return sb.ToString();
    }

    private async Task<string> MyMemoryTranslateAsync(string text, string targetLang, CancellationToken ct)
    {
        // MyMemory needs an explicit pair; assume vi<->en both directions.
        string pair = targetLang.StartsWith("vi", StringComparison.OrdinalIgnoreCase) ? "en|vi" : "vi|en";
        var client = _httpFactory.CreateClient("gemini");
        string url = $"https://api.mymemory.translated.net/get?q={Uri.EscapeDataString(text)}&langpair={pair}";
        using var resp = await client.GetAsync(url, ct);
        resp.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        return doc.RootElement.GetProperty("responseData").GetProperty("translatedText").GetString() ?? text;
    }

    private async Task<string> GenerateAsync(string model, string apiKey, string prompt, CancellationToken ct)
    {
        var client = _httpFactory.CreateClient("gemini");
        string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        var body = new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } },
            generationConfig = new { temperature = 0.4, maxOutputTokens = 1024 }
        };
        using var resp = await client.PostAsync(url,
            new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"), ct);
        string raw = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini call failed: {Status} {Body}", resp.StatusCode, raw);
            throw new InvalidOperationException($"Gemini API error ({(int)resp.StatusCode}). Check your API key/model.");
        }
        using var doc = JsonDocument.Parse(raw);
        return doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text").GetString() ?? "{}";
    }

    private static string StripFences(string s)
    {
        s = s.Trim();
        if (s.StartsWith("```"))
        {
            int first = s.IndexOf('\n');
            int last = s.LastIndexOf("```");
            if (first >= 0 && last > first) s = s.Substring(first + 1, last - first - 1);
        }
        return s.Trim();
    }
}
