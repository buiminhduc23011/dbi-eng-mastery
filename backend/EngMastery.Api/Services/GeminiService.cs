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

public record AiModelInfo(string Id, string Label);

public class GeminiService
{
    /// <summary>
    /// Model used when the learner has not chosen one. Gemini's newest Flash is often rate-limited or
    /// "experiencing high demand" (multi-second hangs), so the default is the stable previous-gen Flash.
    /// </summary>
    public const string DefaultModel = "gemini-3.6-flash";

    /// <summary>Offline list shown when no key is set or the live model list cannot be fetched.</summary>
    public static readonly IReadOnlyList<AiModelInfo> FallbackModels = new List<AiModelInfo>
    {
        new(DefaultModel, "Ổn định & nhanh (khuyến nghị)"),
        new("gemini-3.8-flash", "Mới nhất, có thể quá tải"),
        new("gemini-3.5-flash-lite", "Rẻ & nhanh cho tác vụ nhẹ"),
        new("gemini-3.1-flash-lite", "Tiết kiệm nhất"),
        new("gemini-3.1-pro-preview", "Suy luận sâu (preview)"),
    };

    /// <summary>Model ids Google has retired/routed away; stored settings get moved to <see cref="DefaultModel"/>.</summary>
    public static readonly IReadOnlySet<string> RetiredModels = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro",
        "gemini-2.0-flash", "gemini-2.0-flash-lite",
        "gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro",
        "gemini-3-pro-preview",
    };

    /// <summary>Non-chat endpoints that also advertise generateContent.</summary>
    private static readonly string[] NonChatModelHints =
        { "image", "imagen", "banana", "nano", "veo", "tts", "live", "audio", "transcribe", "embedding", "robotics", "omni", "deep-research", "computer-use", "guard", "lyria" };

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
        var model = await _settings.GetAsync("GeminiModel") ?? DefaultModel;
        return (!string.IsNullOrWhiteSpace(key), model, key);
    }

    /// <summary>
    /// List text models available to the saved API key, straight from Google, so the picker
    /// never goes stale when Gemini renames/retires models. Falls back to <see cref="FallbackModels"/>.
    /// </summary>
    public async Task<(bool FromApi, List<AiModelInfo> Models)> ListModelsAsync(CancellationToken ct = default)
    {
        var (configured, _, key) = await GetConfigAsync();
        if (!configured) return (false, FallbackModels.ToList());

        try
        {
            var client = _httpFactory.CreateClient("gemini");
            string url = $"https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key={Uri.EscapeDataString(key)}";
            using var resp = await client.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini model list failed: {Status}", resp.StatusCode);
                return (false, FallbackModels.ToList());
            }

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
            if (!doc.RootElement.TryGetProperty("models", out var arr) || arr.ValueKind != JsonValueKind.Array)
                return (false, FallbackModels.ToList());

            var ids = new List<string>();
            var labels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var m in arr.EnumerateArray())
            {
                string id = (m.TryGetProperty("name", out var n) ? n.GetString() ?? string.Empty : string.Empty)
                    .Replace("models/", string.Empty, StringComparison.Ordinal);
                if (!id.StartsWith("gemini", StringComparison.OrdinalIgnoreCase)) continue;
                if (NonChatModelHints.Any(h => id.Contains(h, StringComparison.OrdinalIgnoreCase))) continue;

                // Google keeps deprecated ids callable for a while; don't offer them as new choices.
                if (RetiredModels.Contains(id)) continue;

                bool canGenerate = m.TryGetProperty("supportedGenerationMethods", out var methods)
                    && methods.EnumerateArray().Any(x => string.Equals(x.GetString(), "generateContent", StringComparison.OrdinalIgnoreCase));
                if (!canGenerate) continue;

                ids.Add(id);
                labels[id] = m.TryGetProperty("displayName", out var dn) ? dn.GetString() ?? id : id;
            }

            if (ids.Count == 0) return (false, FallbackModels.ToList());

            var preferred = FallbackModels.Select((m, i) => (m.Id, i)).ToDictionary(x => x.Id, x => x.i, StringComparer.OrdinalIgnoreCase);
            var models = ids
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(id => preferred.TryGetValue(id, out var rank) ? rank : preferred.Count)
                .ThenBy(id => id, StringComparer.OrdinalIgnoreCase)
                .Select(id => new AiModelInfo(id, labels[id]))
                .ToList();
            return (true, models);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini model list request failed.");
            return (false, FallbackModels.ToList());
        }
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
        var json = await GenerateWithFallbackAsync(model, key, prompt, ct);
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
        var json = await GenerateWithFallbackAsync(model, key, prompt, ct);
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

    private const int DefaultOutputTokens = 2048;
    private const int RetryOutputTokens = 8192;

    /// <summary>Stable fallback model, used when the chosen one is overloaded/unreachable.</summary>
    public const string FallbackModel = "gemini-3.5-flash-lite";

    /// <summary>Don't wait 60s on a congested model: give the primary a short leash, then fall back.</summary>
    private static readonly TimeSpan PrimaryAttemptTimeout = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan FallbackAttemptTimeout = TimeSpan.FromSeconds(25);
    private static readonly TimeSpan ModelCooldown = TimeSpan.FromMinutes(30);

    /// <summary>Thrown when Gemini is temporarily unavailable (429/5xx/timeout) so a fallback model can take over.</summary>
    public class GeminiUnavailableException : Exception
    {
        public GeminiUnavailableException(string message, Exception? inner = null) : base(message, inner) { }
    }

    /// <summary>Models that rejected <c>thinkingConfig.thinkingLevel</c> (cached after the first 400).</summary>
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, bool> ThinkingLevelRejected =
        new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Circuit breaker: a model that just failed is skipped until <c>cooldownUntil</c>.</summary>
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, DateTime> CooldownUntil =
        new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Gemini 3+ models think by default (medium) and <b>thought tokens count toward maxOutputTokens</b>.
    /// With a small cap that truncated our JSON answers and made calls slow; ask for "low" thinking
    /// on 3.x/4.x and disable it (<c>thinkingBudget: 0</c>) on 2.5 models.
    /// </summary>
    private static Dictionary<string, object>? ThinkingConfigFor(string model)
    {
        if (model.StartsWith("gemini-2", StringComparison.OrdinalIgnoreCase))
            return new Dictionary<string, object> { ["thinkingBudget"] = 0 };
        if (ThinkingLevelRejected.TryGetValue(model, out var rejected) && rejected) return null;
        return new Dictionary<string, object> { ["thinkingLevel"] = "low" };
    }

    private static string BuildPayload(string prompt, Dictionary<string, object>? thinkingConfig, int maxOutputTokens)
    {
        var generationConfig = new Dictionary<string, object>
        {
            // Thought tokens + the JSON answer share this budget.
            ["maxOutputTokens"] = maxOutputTokens,
            ["temperature"] = 0.4,
        };
        if (thinkingConfig is not null) generationConfig["thinkingConfig"] = thinkingConfig;
        return JsonSerializer.Serialize(new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } },
            generationConfig
        });
    }

    private async Task<string> GenerateAsync(string model, string apiKey, string prompt,
        TimeSpan attemptTimeout, int maxAttempts, CancellationToken ct)
    {
        var client = _httpFactory.CreateClient("gemini");
        string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        var thinkingConfig = ThinkingConfigFor(model);
        int attempt = 0;
        int maxOutputTokens = DefaultOutputTokens;
        bool grownForTruncation = false;

        // Retries: 429/5xx are transient ("high demand"). A rejected thinkingConfig is retried
        // once without it and remembered, so older/edge models keep working.
        while (true)
        {
            attempt++;
            string raw;
            System.Net.HttpStatusCode status;
            try
            {
                // Cap each attempt so a hanging model cannot stall the whole request.
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeoutCts.CancelAfter(attemptTimeout);
                using var resp = await client.PostAsync(url,
                    new StringContent(BuildPayload(prompt, thinkingConfig, maxOutputTokens), Encoding.UTF8, "application/json"),
                    timeoutCts.Token);
                status = resp.StatusCode;
                raw = await resp.Content.ReadAsStringAsync(ct);
            }
            catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning("{Model} timed out after {Timeout}s.", model, attemptTimeout.TotalSeconds);
                throw new GeminiUnavailableException("Gemini request timed out.", ex);
            }

            if ((int)status is >= 200 and < 300)
            {
                using var doc = JsonDocument.Parse(raw);
                var candidate = doc.RootElement.GetProperty("candidates")[0];
                string finish = candidate.TryGetProperty("finishReason", out var fr) ? fr.GetString() ?? "" : "";
                string? answer = null;
                if (candidate.TryGetProperty("content", out var content)
                    && content.TryGetProperty("parts", out var parts)
                    && parts.GetArrayLength() > 0
                    && parts[0].TryGetProperty("text", out var textEl))
                {
                    answer = textEl.GetString();
                }

                if (finish == "MAX_TOKENS" && !grownForTruncation)
                {
                    // Thoughts ate the budget before the answer was complete — retry once with more room.
                    _logger.LogWarning("{Model} hit MAX_TOKENS at {Cap}, retrying with {Next}.",
                        model, maxOutputTokens, RetryOutputTokens);
                    maxOutputTokens = RetryOutputTokens;
                    grownForTruncation = true;
                    attempt--;
                    continue;
                }

                if (answer is null)
                {
                    _logger.LogWarning("{Model} returned no text (finishReason={Finish}).", model, finish);
                    throw new GeminiUnavailableException($"Gemini returned no text (finishReason: {finish}).");
                }
                if (finish == "MAX_TOKENS")
                    _logger.LogWarning("{Model} answer truncated at {Cap} tokens.", model, maxOutputTokens);

                CooldownUntil.TryRemove(model, out _);
                return answer;
            }

            if (status == System.Net.HttpStatusCode.BadRequest
                && thinkingConfig is not null
                && raw.Contains("thinking", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("{Model} rejected thinkingConfig, retrying without it.", model);
                ThinkingLevelRejected[model] = true;
                thinkingConfig = null;
                attempt--;
                continue;
            }

            bool transient = status is System.Net.HttpStatusCode.TooManyRequests
                or System.Net.HttpStatusCode.InternalServerError
                or System.Net.HttpStatusCode.BadGateway
                or System.Net.HttpStatusCode.ServiceUnavailable
                or System.Net.HttpStatusCode.GatewayTimeout;
            _logger.LogWarning("Gemini call failed ({Attempt}/{MaxAttempts}): {Status} {Model} {Body}",
                attempt, maxAttempts, status, model, raw);

            if (transient && attempt < maxAttempts)
            {
                await Task.Delay(TimeSpan.FromSeconds(attempt), ct);
                continue;
            }
            if (transient)
                throw new GeminiUnavailableException($"Gemini API error ({(int)status}).");
            throw new InvalidOperationException($"Gemini API error ({(int)status}). Check your API key/model.");
        }
    }

    /// <summary>
    /// Generate with the chosen model, falling back to <see cref="FallbackModel"/> when it is overloaded.
    /// A failing model is skipped for <see cref="ModelCooldown"/> so the next call is fast, not a 20s wait.
    /// </summary>
    private async Task<string> GenerateWithFallbackAsync(string model, string apiKey, string prompt, CancellationToken ct)
    {
        bool isFallback = string.Equals(model, FallbackModel, StringComparison.OrdinalIgnoreCase);
        bool cooling = CooldownUntil.TryGetValue(model, out var until) && until > DateTime.UtcNow;

        if (!isFallback && !cooling)
        {
            try
            {
                // One attempt only: retrying a congested model just doubles the wait.
                return await GenerateAsync(model, apiKey, prompt, PrimaryAttemptTimeout, maxAttempts: 1, ct);
            }
            catch (GeminiUnavailableException ex)
            {
                CooldownUntil[model] = DateTime.UtcNow + ModelCooldown;
                _logger.LogWarning("{Model} unavailable ({Reason}); using {Fallback} for the next {Minutes} min.",
                    model, ex.Message, FallbackModel, ModelCooldown.TotalMinutes);
            }
        }
        else if (cooling)
        {
            _logger.LogInformation("{Model} is cooling down until {Until:HH:mm}; using {Fallback}.",
                model, until, FallbackModel);
        }

        return await GenerateAsync(FallbackModel, apiKey, prompt, FallbackAttemptTimeout, maxAttempts: 2, ct);
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
