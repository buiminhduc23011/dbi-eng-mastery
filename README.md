# EngMastery — Self-Hosted English SRS Lab

Spaced Repetition (SM-2) + active recall + technical/workplace English, **90% offline-first**.
Gemini AI is strictly **on-demand** (manual buttons only) to minimize API quota usage.

## Features

### Beginner-first upgrade (v3)

- **Học hôm nay:** 12 guided foundation lessons / 36 practical sentences. Vietnamese explanations, meaning choices, cloze, word ordering, independent recall and optional speaking. A daily session adds up to two due warm-up sentences before a new lesson.
- **No-pressure feedback:** hints and retries; independent recall is counted only when correct on the first attempt without a recall hint. Offline comparison is explicitly not a semantic or pronunciation assessment.
- **Câu của tôi:** translate a personal thought, practise it through the same guided flow, then save it to the existing sentence-drill schedule. Find saved sentences under **Luyện câu → Câu của tôi**. Translation still needs a network connection; foundation lessons do not call AI.
- **Personal notebook UI:** warm light/forest dark themes, desktop sidebar, mobile quick navigation, visible keyboard focus and reduced-motion support. All previous study tools remain accessible.
- Foundation completion is stored server-side in dedicated `Learning.v1.lesson.*` settings, with no database schema changes. One completion per lesson per UTC day is credited; retries do not inflate activity. A poor independent-recall result returns tomorrow; successful repeat sessions space to 1/3/7/14 days. Existing card schedules are untouched.
- A lesson is saved when **Lưu & hoàn thành buổi học** succeeds, not after each step. Leaving an unfinished lesson warns first. Microphone recognition is optional and depends on browser permissions/support; it is not a pronunciation score.

**Data safety:** this upgrade does not reset, replace or reseed existing learner records. JSON export v2 adds study history and foundation progress without API credentials. Import is **add-missing only**: existing cards, drills, dates and lesson progress always win, including seeded records. It is not a full point-in-time restore. Before deploying, back up the actual database with a provider-appropriate consistent backup (SQLite backup API / stopped-service copy including committed WAL state, or SQL Server native backup). Keep the existing database path and volume unchanged. No production deployment is performed by the upgrade tests.

Verification (Node 22.6+ and installed .NET SDK):

```powershell
dotnet build backend/EngMastery.Api
node scripts/verify-learning-api.mjs
cd frontend
npm test
npm run lint
npm run build
```

The integration script creates temporary SQLite databases and uses port 8190; it refuses an occupied port. It never opens the learner database. `API_PROXY_TARGET` can point Vite to a separate test backend; the default remains `http://localhost:8090`. Browser smoke scenario: `frontend/tests/session.browser.js` (run only on an isolated instance, starting lesson 01).

| Area | What it does | AI cost |
|---|---|---|
| **SRS Review** | True SM-2 engine (`Again/Hard/Good/Easy` → interval, EF ≥ 1.3). Flip-card 3D + Cloze fill-in modes, keyboard `Space/1-4/R`, TTS | 0 |
| **Sentence Drills** | VI → EN translation, offline grading (token matching + Levenshtein → 0–100%) | 0 |
| **Shadowing Studio** | Native TTS at 1.0x/0.8x, record via SpeechRecognition, green/red word highlighting | 0 |
| **AI Polish** | Grammar correction, naturalness score, Casual vs Professional versions | on click |
| **AI Translator** | Rough VI/broken EN → Business + Casual + vocab breakdown, **+ Save to SRS Deck** | on click |
| **Dashboard** | Streak, due counts, mastered, 7-day forecast bars, leech table (top mistakes) | 0 |
| **Card Manager** | CRUD, search/filter, JSON export/import | 0 |

Seeded with **64 vocab cards** (Software & Dev · Industrial & Automation · Meetings & Standup) + **18 sentence drills**.

## Quick start (local dev)

```powershell
# Backend (SQLite auto-created + migrated + seeded)
dotnet run --project backend/EngMastery.Api
# -> http://localhost:8090, Swagger at /swagger

# Frontend (proxies /api -> :8090)
cd frontend; npm install; npm run dev
# -> http://localhost:5173
```

## Configuration

`backend/EngMastery.Api/appsettings.json` (or environment variables):

| Key | Default | Notes |
|---|---|---|
| `Database:Provider` | `auto` | `sqlite` / `sqlserver` / `auto` (uses SQL Server if its connection string is set) |
| `ConnectionStrings:Sqlite` | `Data Source=engmastery.db` | file path |
| `ConnectionStrings:SqlServer` | empty | e.g. `Server=192.168.11.101,1433;Database=EngMastery;User Id=sa;Password=...;TrustServerCertificate=True` |
| `Urls` | `http://*:8090` | listening port |

Gemini key is stored in the `AppSetting` table via **Settings page** in the UI. The model picker is populated live from `GET /api/ai/models` (Gemini `v1beta/models`, text models with `generateContent`), so renamed/retired models show up automatically; if no key is set it falls back to the built-in list (`gemini-3.6-flash` by default). Stored ids that Google has retired are migrated to the current default on startup. Calls are capped at 15s for the chosen model and fall back to `gemini-3.5-flash-lite`; a model that just failed is skipped for 30 minutes so the next call is fast.

## Docker deploy (Linux home-server)

```bash
docker compose up -d --build
# Web UI (nginx):  http://home-server:8091   (/api proxied to backend)
# API direct:      http://home-server:8090
# Data persisted in ./data/engmastery.db
```

For SQL Server: uncomment the `mssql` service + switch provider env vars in `docker-compose.yml`.

## systemd deploy (same pattern as acs.simulator)

Single service on port **8090** — the API also serves the React build from `wwwroot`:

```powershell
# One-time on home-server:
#   sudo cp deploy/engmastery.service /etc/systemd/system/
#   sudo systemctl enable engmastery

# Deploy from this PC:
.\deploy\deploy-to-home-server.ps1
# -> http://home-server:8090
```

The script publishes `linux-x64` self-contained, builds the frontend into `wwwroot`,
`scp`s to `/tmp`, preserves `engmastery.db`, swaps `/home/ducne/engmastery/server`,
and restarts the service.

## API map

- `GET /api/srs/due` · `POST /api/srs/{id}/review {quality 1-4}`
- `GET /api/cards` CRUD · `GET /api/cards/categories`
- `GET /api/typing/next?category=&mode=all|mistakes` · `POST /api/typing/{id}/submit {userInput}` · `GET /api/typing/mistakes/count`
- `GET /api/drills/due` · `POST /api/drills/{id}/submit {userInput}`
- `POST /api/ai/evaluate-sentence` · `POST /api/ai/polish` · `GET /api/ai/status`
- `GET /api/dashboard` · `POST /api/dashboard/log-time`
- `GET /api/backup/export` · `POST /api/backup/import`
- `GET/PUT /api/settings`

## Typing practice

Input is normalized (case, whitespace, punctuation, apostrophes) and compared with Levenshtein similarity; a pass needs ≥ 0.9 against the card term.

`VocabCards.AltTermsJson` lists accepted paraphrases for a card (seeded from `DataSeeder.AltTerms.cs`). A paraphrase match is a **near miss**: right meaning, wrong target phrase — it does not raise `MistakeCount` and does not reset the streak, but it never earns streak credit and the card stays in today's queue.

The streak advances only on the first passing attempt of a due card on a new day. A miss does not end the day automatically: the daily attempt budget depends on the reflex level when the first miss happens (`SameDayAttemptCap`) — level 0–1 → 3 attempts, level 2 → 2 attempts, level 3+ → a single shot. A failed card is never re-asked immediately (the answer was just on screen); the client re-queues it and serves it again after 3 other cards. The level survives mid-day retries — a correct retry keeps it without adding a level — and only spending the whole budget without a pass drops it to level 0 and hides the card until tomorrow.

## SM-2 details

Rating `q` maps to classic quality `0/3/4/5`. Fail (`q<3`): mistakes+1, rep=0, interval=1 day. (Typing: each correct answer also decrements the mistake counter, floor 0.)
Pass: `EF += 0.1 − (5−q)(0.08 + (5−q)·0.02)` (min 1.3); intervals `1 → 6 → round(prev·EF)`.
Status: `Mastered` at rep ≥ 6 & interval ≥ 21d; `Review` at rep ≥ 3; else `Learning`/`New`.
