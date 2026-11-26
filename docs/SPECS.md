# EngMastery: beginner-first upgrade

Approved scope (2026-11-26): all five learning improvements discussed with the owner, plus a cohesive responsive UI refresh. Personal, Vietnamese-speaking learner; foundation first, everyday and workplace English next. No production deployment in this change.

## Acceptance criteria
- A home screen with one daily-session action, a beginner pathway and access to every existing tool.
- Twelve short, curated lessons: Vietnamese explanation, recognition, cloze, ordering, independent recall and optional speaking.
- A finite daily session combines due foundation review with one new lesson; completion is persisted on the server, retry-safe, with a next-review date.
- Hints and explanatory feedback never pretend string comparison is semantic/grammar assessment.
- Personal translated sentences can be practised and saved into the existing drill schedule.
- Light/dark themes, mobile navigation, keyboard focus, reduced motion and readable controls.
- Existing cards, drills, settings, study logs, schedules and identifiers are not reset or replaced.

## Storage and API
No schema migration or dependency additions. Foundation progress uses dedicated `Learning.v1.lesson.{id}` rows in existing AppSettings. Existing learning tables remain unchanged except an additive study-log activity when a lesson completes. Test databases must be isolated from appdata/engmastery.db.

- GET /api/learning/progress: bounded dictionary of the twelve known lessons.
- PUT /api/learning/lessons/{id}/completion: `{ independentCount: 0..3 }`; server dates and repeat scheduling, at most one credited completion per UTC day. Returns progress; 404 unknown lesson, 400 invalid count. Single-user trusted home-network app, matching existing auth model. No public deployment implied.
- Existing /api/drills and /api/backup remain compatible. Backup adds studyLogs and non-secret learning progress; import merges missing entries only, never replaces existing records. Full database backup remains required before production deployment.

## Verification
Build frontend/backend; Node built-in tests for lesson contents/session/feedback; isolated API integration checks for persistence, duplicate completion, legacy data preservation and backup. Browser smoke tests desktop/mobile/light/dark if available. No real AI calls needed for baseline learning.
