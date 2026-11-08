# EngMastery — Self-Hosted English SRS Lab

Spaced Repetition (SM-2) + active recall + technical/workplace English, **90% offline-first**.
Gemini AI is strictly **on-demand** (manual buttons only) to minimize API quota usage.

## Features

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

Gemini key is stored in the `AppSetting` table via **Settings page** in the UI (models: `gemini-2.5-flash`, `gemini-1.5-flash`).

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
- `GET /api/drills/due` · `POST /api/drills/{id}/submit {userInput}`
- `POST /api/ai/evaluate-sentence` · `POST /api/ai/polish` · `GET /api/ai/status`
- `GET /api/dashboard` · `POST /api/dashboard/log-time`
- `GET /api/backup/export` · `POST /api/backup/import`
- `GET/PUT /api/settings`

## SM-2 details

Rating `q` maps to classic quality `0/3/4/5`. Fail (`q<3`): mistakes+1, rep=0, interval=1 day.
Pass: `EF += 0.1 − (5−q)(0.08 + (5−q)·0.02)` (min 1.3); intervals `1 → 6 → round(prev·EF)`.
Status: `Mastered` at rep ≥ 6 & interval ≥ 21d; `Review` at rep ≥ 3; else `Learning`/`New`.
