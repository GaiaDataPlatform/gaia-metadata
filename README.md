# gaia-metadata

**Campaign and event management console for R/V Gaia Blu**  
v0.3.4

---

## Overview

gaia-metadata is a web application that runs aboard the R/V Gaia Blu to log scientific operations in real time. Operators register oceanographic campaigns, then start and annotate tasks (CTD casts, multibeam lines, ADCP transects, ROV dives, drifter deployments, FerryBox acquisitions) as they happen on deck.

Each task event is immediately broadcast as a proprietary NMEA sentence (`$PGBEV`) to **gaia-acquisition**, the ship's data ingestor, so the event log is co-registered with instrument data in InfluxDB without any manual post-processing.

---

## Architecture

```
Browser (port 8088)
    │
    ▼
gaia-metadata-ui        nginx, serves React SPA
    │  /api/v1 →
    ▼
gaia-metadata-api       FastAPI + SQLAlchemy async
    │  SQL →
    ▼
gaia-metadata-db        PostgreSQL 16

gaia-metadata-api
    │  UDP $PGBEV → NMEA_HOST:NMEA_PORT (default 172.17.0.1:10115)
    ▼
gaia-acq-ingestor       network_mode: host — writes to InfluxDB

gaia-metadata-api
    │  HTTP GET /api/v1/live/navigation/Seapath/GPGGA
    ▼
gaia-acq-api            live GPS position for task georeferencing
```

---

## Requirements

- Docker Engine ≥ 24 with Compose plugin
- The `gaia-acquisition` stack must be running and reachable
- gaia-acq-ingestor must have a UDP source configured on port 10115

---

## Quick start

```bash
git clone <repo-url> gaia-metadata
cd gaia-metadata

# Create your environment file from the template
cp .env.example .env
nano .env          # set passwords, SECRET_KEY, NMEA_HOST

# Build and start
docker compose up -d --build

# Check logs
docker compose logs -f backend
```

The UI is available at `http://<host>:8088`.  
Default credentials: `admin` / `gaiaadmin` — **change immediately**.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `gaia` | DB username |
| `POSTGRES_PASSWORD` | — | DB password (required) |
| `POSTGRES_DB` | `gaia_metadata` | DB name |
| `SECRET_KEY` | — | JWT signing key — generate with `openssl rand -hex 32` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `525600` | Session duration (~1 year) |
| `NMEA_HOST` | `host.docker.internal` | Host receiving $PGBEV sentences |
| `NMEA_PORT` | `10115` | UDP port for $PGBEV |
| `GAIA_ACQUISITION_URL` | `http://host.docker.internal:8080` | gaia-acquisition REST API |
| `APP_PORT` | `8088` | Exposed port for the UI |
| `VESSEL_NAME` | `Gaia Blu` | Included in NMEA sentences |
| `PGADMIN_EMAIL` | `admin@gaiablu.local` | pgAdmin login (admin profile) |
| `PGADMIN_PASSWORD` | `gaiaadmin` | pgAdmin password (admin profile) |
| `PGADMIN_PORT` | `5050` | pgAdmin exposed port (admin profile) |

### Finding the correct NMEA_HOST

gaia-acq-ingestor runs with `network_mode: host`. From inside the
gaia-metadata-api container, the host is reachable at the Docker bridge
gateway address, typically `172.17.0.1`:

```bash
ip route | grep docker   # run on the host
# or
docker exec gaia-metadata-api getent hosts host.docker.internal
```

Set `NMEA_HOST` to the IP returned, then `docker compose up -d backend`.

---

## Updating

Database state lives in a named Docker volume (`gaia-metadata-pgdata`)
and is never touched by the update procedure.

```bash
# 1. Backup the .env — it is not in the repository
cp .env /tmp/gaia-metadata.env.bak

# 2. Pull new code
git pull

# 3. Restore .env if needed, rebuild
docker compose down
docker compose up -d --build
```

---

## Optional: pgAdmin

pgAdmin is included as an optional Docker Compose profile and is not
started by default.

```bash
# Start with pgAdmin
docker compose --profile admin up -d

# pgAdmin will be available at http://<host>:5050
# Log in with PGADMIN_EMAIL / PGADMIN_PASSWORD from .env
```

To connect to the database from inside pgAdmin, create a server with:

| Field | Value |
|---|---|
| Host | `gaia-metadata-db` |
| Port | `5432` |
| Database | value of `POSTGRES_DB` |
| Username | value of `POSTGRES_USER` |
| Password | value of `POSTGRES_PASSWORD` |

---

## User roles

| Role | Permissions |
|---|---|
| `admin` | Full access: users, instruments, cruises, tasks |
| `capo_missione` | Cruises and tasks only |
| `operatore` | Tasks on the active cruise only |

---

## NMEA sentence format

```
$PGBEV,<event>,<task_id>,<cruise_code>,<lat>,<lon>*<XOR checksum><CR><LF>
```

Events emitted:

| Event | Trigger |
|---|---|
| `START` | Task created |
| `<operation_name>` | Operation logged (e.g. `START_CAST`, `MAX_DEPTH`) |
| `END` | Final operation logged — task auto-closed |
| `ABORT` | Task manually aborted |

Fields written to InfluxDB measurement `event`:
`sentence_type`, `source_id`, `cruise`, `event`, `event_time`, `operator`, `tasktype`

---

## Instrument categories (seed data)

| Name | Type | Operations |
|---|---|---|
| CTD / Rosette | point | Start cast → Max depth → End cast |
| Multibeam (MBES) | transect | Line start → Line end |
| ADCP (VM-ADCP) | transect | Transect start → Transect end |
| ROV | point | In water → On bottom → Off bottom → On deck |
| Drifter / Argo Float | point | Deployment |
| FerryBox | transect | Acquisition start → Acquisition end |

New categories and operations can be added by admin users from the
Instruments page, or directly via the REST API.

---

## API

Base URL: `/api/v1`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/token` | Login — returns JWT |
| GET | `/auth/me` | Current user |
| GET | `/cruises/` | List all cruises |
| POST | `/cruises/` | Create cruise |
| GET | `/cruises/active` | Active cruise (by status or date range) |
| POST | `/cruises/{id}/activate` | Manually activate |
| POST | `/cruises/{id}/complete` | Close cruise |
| GET | `/cruises/{id}/export/csv` | Task log as CSV |
| GET | `/cruises/{id}/export/json` | Full cruise as JSON |
| GET | `/instruments/` | Active instrument categories |
| GET | `/instruments/all` | All categories (admin) |
| POST | `/tasks/` | Start a task |
| POST | `/tasks/{id}/operations` | Log an operation |
| POST | `/tasks/{id}/abort` | Abort a task |
| GET | `/tasks/cruise/{id}/active` | Active tasks for cruise |
| GET | `/tasks/cruise/{id}` | All tasks for cruise |
| GET/POST | `/users/` | User management (admin) |

---

## Themes

The UI supports four visual themes switchable per-session from the sidebar:

| Key | Name | Description |
|---|---|---|
| `blue` | Blue | Default — dark navy/ocean palette |
| `light` | Light | White background, dark text |
| `green` | Green | Dark forest/teal palette |
| `impact` | Impact | Light background, warm orange accents on active tasks |

The selected theme is persisted in `localStorage`.

---

## Known issues / roadmap

See `docs/NOTES.md` for the full list. Key items:

- GPS position fetch latency (slow DNS resolution of `host.docker.internal`)
- No toast/error feedback in the UI on API errors
- `extra_fields` on existing instrument categories not editable from UI
- Pagination missing on task log for long cruises
