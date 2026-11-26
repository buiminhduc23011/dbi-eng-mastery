# Beginner-first upgrade

Status: deployed to existing home-server service on 2026-11-26

1. [x] Inspect data boundaries and define additive upgrade — initially clean worktree.
2. [x] Implement 12-lesson pathway, session engine and isolated progress API.
3. [x] Refresh application shell and learning interface; preserve all nine navigation destinations.
4. [x] Integrate personal practice, honest feedback and additive backup.
5. [x] Verify builds, automated tests, data preservation and browser behavior.

Design: warm paper, forest green, editorial headings, calm whitespace. Existing dark preference retained. No git push. Deployment subsequently authorized by the owner.

## Verification evidence — 2026-11-26
- Frontend production build exit 0; oxlint exit 0 with no warnings; 8/8 Node tests.
- Backend build: 0 warnings / 0 errors; 8/8 isolated SQLite integration checks, including restart, concurrent duplicate completion, settings isolation, old-row equality and additive backup import.
- Browser: 18-step foundation session; deliberate grammar error gives Vietnamese explanation; independent recall shows 2/3; completion persists across reload.
- Browser: offline completion shows retryable error, reconnect and save succeeds. Offline progress loading blocks study rather than assuming a fresh account; retry restores progress.
- Browser: personal translation fallback, four-step practice and saved sentence visible under Luyện câu → Câu của tôi.
- All nine destinations render at desktop width without horizontal overflow; light/dark screenshots reviewed at 390px and desktop. No uncaught browser errors in the checked flows.
- Original local DB SHA256 unchanged: 64FBED376EB30EB32C59506CC4D9201262CE4C39185F3292B21D3E4297A4CDFE.

## Remaining environment checks, not implementation claims
- Real microphone/audio quality and configured Gemini responses require user device/key testing.
- SQL Server execution was not available; integration verification used SQLite. No schema migration was introduced.
- JSON import intentionally never overwrites existing rows (including built-in seeds); use a consistent database backup for full rollback before production deployment.

## Deployment verification — 2026-11-26
- URL: http://home-server:8090 — existing internal service, no new public exposure or service config change.
- Linux-x64 self-contained publish and frontend production build succeeded; unit tests 8/8 and lint clean in deployment turn.
- Used `deploy/safe-release.py` instead of destructive old installer. Consistent SQLite backup with integrity_check=ok: `/home/ducne/engmastery/backups/20261126-beginner/engmastery.db`.
- Prior executable directory retained: `/home/ducne/engmastery/server-before-20261126-beginner`.
- Post-start comparison against backup: 4,199 vocabulary cards, 30 drills, 15 study logs, 3 settings and 4 migration records preserved exactly; zero additions or changes.
- Service active; learning progress endpoint HTTP 200; served index matched built release. Actual home screen and first lesson opened in browser; mobile screenshot inspected, no uncaught browser errors. No practice completion submitted to the live database.
- Targeted deployment/config checks performed, not a comprehensive security audit. Existing app remains trusted-network/single-user only.
