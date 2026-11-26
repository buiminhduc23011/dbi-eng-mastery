# Upgrade decisions

## 2026-11-26 — additive foundation progress

- Preserve all existing card/drill identifiers and schedules; no schema migration. The twelve known foundation lessons store progress in namespaced AppSettings rows, not localStorage.
- Internal single-user API retains existing trusted-network auth assumptions and URL style. GET `/api/learning/progress` is bounded to known lessons. PUT `/api/learning/lessons/{id}/completion` accepts `independentCount` 0–3; response is LessonProgress. Validation returns 400 (ASP.NET validation ProblemDetails), unknown lesson returns 404 `{code,message}`.
- Server UTC controls credit and next-review dates. Completion is at most once per lesson/day, transactionally paired with study activity; a process-local gate serializes concurrent requests in the current single-instance deployment.
- Settings GET/PUT exclude the progress namespace so old settings clients cannot overwrite it with a stale snapshot.
- Backup v2 is additive and credential-free. Old backup payloads remain accepted. Imports preserve existing records; they are not a full database restore.
- Offline text comparison remains explicitly distinct from semantic/grammar assessment. AI is still manual/on-demand; speech recognition is optional and not presented as pronunciation grading.
- Existing tools are lazy-loaded, while the small foundation curriculum is bundled with the home screen. No dependencies added.
