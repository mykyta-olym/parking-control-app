# Parking Control — Backend

FastAPI service that aggregates parking sensor telemetry and serves the frontend a real-time view of zone occupancy. Demo data and typed schemas are already bundled so the UI team can see which fields are available and wire them up quickly.

> All commands below assume you run them from the `backend/` directory (repo root hosts frontend + backend).

## What the service does
- ingests zone-level occupancy snapshots (admin API) and exposes free/occupied counters;
- exposes a zone snapshot via `/api/v1/parking` and facility cards via `/api/v1/parkings*`;
- supports filtering by district, price, and free capacity;
- protects the ingest endpoint with `X-API-Key` or JWT Bearer tokens;
- **Admin Panel API** for managing zones, districts, and viewing analytics.

## Tech stack
- Python 3.11–3.13, FastAPI, Pydantic v2;
- SQLAlchemy 2.0, SQLite by default (override `DB_URL` in `.env`);
- Uvicorn (dev server), JWT via `pyjwt`.

## Project layout
```
app/
  main.py              # FastAPI entrypoints and routes
  core/                # settings + auth helpers
  db/                  # engine/session + init/seed scripts
  models/, repos/, services/
  routers/
    admin.py           # Admin panel API endpoints
  schemas/
    admin.py           # Admin Pydantic schemas
    ...                # Other request/response models
  services/
    admin_service.py   # Admin business logic
    ...
requirements.txt
SQLite/                # local DB folder 
```

## Quick start
0. `cd backend`
1. **Create a virtualenv**
   - Linux / macOS / WSL
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     python -m pip install -U pip
     pip install -r requirements.txt
     cp .env.example .env
     ```
   - Windows (PowerShell)
     ```powershell
     py -m venv .venv
     .\.venv\Scripts\Activate.ps1
     python -m pip install -U pip
     pip install -r requirements.txt
     Copy-Item .env.example .env
     ```
2. **Configure `.env`** (table below). For local dev you can stick with `DB_URL=sqlite:///SQLite/dev.db` (or async `sqlite+aiosqlite:///./SQLite/dev.db`).
3. **Bootstrap SQLite** (if you use it):
   ```bash
   python -m app.db.init_sqlite --reset   # create/recreate tables
   python -m app.db.seed_demo --reset     # load demo zones with sample counters
   ```
4. **Run the API**
   ```bash
   uvicorn app.main:app --reload
   ```
   Swagger and Redoc live under `/docs` and `/redoc`.

## Environment variables
| Key | Purpose | Example |
| --- | --- | --- |
| `DB_URL` | SQLAlchemy URL (SQLite, Postgres, etc.) | `sqlite:///SQLite/dev.db` |
| `CORS_ORIGINS` | Allowed origins (JSON string, CSV, or `*`) | `["http://localhost:3000"]` |
| `ADMIN_API_KEYS` | API keys allowed to hit admin endpoints | `["dev-admin-key-a2f4e7c9d13b48e0b97f65c1a3d920ef"]` |
| `APP_JWT_SECRET` | JWT signing secret (for Bearer auth) | `super-secret` |
| `APP_JWT_ISS`, `APP_JWT_AUD`, `APP_JWT_ALG`, `APP_TOKEN_TTL_SECONDS` | Optional JWT validation knobs |  |

> If both `ADMIN_API_KEYS` and `APP_JWT_SECRET` are empty, admin endpoints return 401. Configure at least one auth method.

## API (frontend essentials)

### `GET /api/v1/parking`
Aggregated list of zones with geometry and counters.

Sample response:
```json
{
  "server_ts": "2024-06-01T10:15:00Z",
  "zones": [
    {
      "id": "zone-main-square",
      "name": "Main Square",
      "type": "street",
      "district": "STARE MESTO",
      "polygon": { "type": "Polygon", "coordinates": ["..."] },
      "counters": { "free": 10, "occupied": 32, "total": 42 },
      "newest_ts": "2024-06-01T10:14:20Z"
    }
  ]
}
```

### `GET /api/v1/parkings`
Facility cards for list/detail views. Supported query params:
- `district` — filter by district code (`ZAPAD`, `SEVER`, `STARE MESTO`, `JUH`);
- `only_free=true` — keep facilities with `free_spots > 0`;
- `max_price=1.5` — threshold on `price_per_hour`;
- `q` — fuzzy search across name/address.

Response:
```json
{
  "server_ts": "2024-06-01T10:15:00Z",
  "items": [
    {
      "id": "zone-main-square",
      "name": "Main Square",
      "district": {
        "code": "STARE MESTO",
        "label": "Staré Mesto",
        "color": "#FF8800"
      },
      "address": "Hlavná 1, Košice",
      "coordinates": { "latitude": 48.7133, "longitude": 21.2439 },
      "features": ["24/7", "EV"],
      "is_open": true,
      "total_spots": 42,
      "free_spots": 10,
      "price": "1.00€/hod",
      "price_per_hour": 1.0,
      "last_update": "2024-06-01T10:14:20Z"
    }
  ]
}
```

### `GET /api/v1/parkings/{parking_id}`
Returns a single facility (same payload as the list) or 404 if not found.

---

## Admin Panel API

All admin endpoints require `X-API-Key` header with a valid key from `ADMIN_API_KEYS`.

**Default dev key:** `dev-admin-key-a2f4e7c9d13b48e0b97f65c1a3d920ef`

### Dashboard

#### `GET /admin/dashboard`
Returns aggregated statistics for the admin dashboard.

Response:
```json
{
  "totalZones": 15,
  "totalSpots": 1250,
  "occupiedSpots": 780,
  "freeSpots": 470,
  "occupancyRate": 62.4,
  "dailyRevenue": 2450.50,
  "districts": [
    {
      "district": "stare-mesto",
      "districtLabel": "Staré Mesto",
      "color": "#FF8800",
      "totalSpots": 300,
      "occupiedSpots": 180,
      "freeSpots": 120,
      "occupancyRate": 60.0
    }
  ]
}
```

### Zone Management

#### `GET /admin/zones`
List all zones with filtering and sorting.

Query params:
- `district` — filter by district code
- `type` — filter by zone type (street, garage, lot, private)
- `status` — filter by status (open, closed, all)
- `sort` — sort field (name, occupancy_rate, free_spots, total_spots, price)
- `order` — sort order (asc, desc)
- `q` — search by name or address

Response:
```json
{
  "items": [
    {
      "id": "zone-1",
      "name": "Hlavná ulica",
      "type": "street",
      "district": "stare-mesto",
      "districtLabel": "Staré Mesto",
      "districtColor": "#FF8800",
      "address": "Hlavná 1, Košice",
      "lat": 48.7133,
      "lon": 21.2439,
      "totalSpots": 50,
      "occupiedSpots": 30,
      "freeSpots": 20,
      "occupancyRate": 60.0,
      "pricePerHour": 1.50,
      "priceLabel": "1,50 €/h",
      "features": ["24/7", "EV"],
      "isOpen": true,
      "openingHours": "24/7",
      "lastUpdate": "2024-06-01T10:14:20Z"
    }
  ],
  "total": 15
}
```

#### `GET /admin/zones/{zone_id}`
Get single zone details.

#### `POST /admin/zones`
Create a new zone.

Request body:
```json
{
  "name": "New Parking Zone",
  "type": "street",
  "district": "stare-mesto",
  "address": "Hlavná 15, Košice",
  "lat": 48.7140,
  "lon": 21.2450,
  "totalSpots": 30,
  "occupiedSpots": 0,
  "pricePerHour": 1.50,
  "priceLabel": "1,50 €/h",
  "features": ["24/7"],
  "isOpen": true,
  "openingHours": "24/7",
  "description": "Street parking near city center"
}
```

#### `PUT /admin/zones/{zone_id}`
Update an existing zone.

#### `DELETE /admin/zones/{zone_id}`
Delete a zone.

### District Analytics

#### `GET /admin/districts`
List all districts with occupancy statistics.

#### `GET /admin/districts/{district_id}/analytics`
Get detailed analytics for a specific district.

Response:
```json
{
  "district": "stare-mesto",
  "districtLabel": "Staré Mesto",
  "color": "#FF8800",
  "currentOccupancyRate": 65.5,
  "totalSpots": 450,
  "freeSpots": 155,
  "dailyStats": [
    { "date": "2024-06-01", "avgOccupancy": 62.3, "revenue": 850.00 }
  ],
  "hourlyPattern": [
    { "hour": 8, "avgOccupancy": 45.2 },
    { "hour": 9, "avgOccupancy": 78.5 }
  ],
  "peakHours": ["09:00", "12:00", "17:00"],
  "avgDailyRevenueEstimate": 920.50,
  "zones": [
    { "id": "zone-1", "name": "Hlavná ulica", "occupancyRate": 70.0 }
  ]
}
```

### Ingest API

#### `POST /admin/ingest/snapshot`
Accepts aggregated counters per zone (for IoT sensors / AI camera).

Payload:
```json
{
  "zones": [
    {
      "zone_id": "zone-main-square",
      "total_spots": 60,
      "occupied_spots": 18,
      "ts": "2024-06-01T10:14:00Z"
    }
  ]
}
```

Response reports how many items were received/updated/ignored.

#### Ingest authentication
1. **API key** — send `X-API-Key: <key>` (values from `ADMIN_API_KEYS`).
2. **JWT Bearer** — standard `Authorization: Bearer <token>`, validated according to `.env`.

---

## Useful commands
- `python -m app.db.init_sqlite --reset` — recreate the SQLite schema.
- `python -m app.db.seed_demo --reset` — load demo data.
- `uvicorn app.main:app --reload` — start the dev server.

Whenever dependencies change, update `requirements.txt`. Tests are not included yet, but the service is easy to cover with pytest + httpx, and the JSON snippets above double as a quick contract for the frontend.

## Docker
- Build: `docker build -t parking-control-backend:dev -f backend/Dockerfile backend`
- Run locally: `docker run --rm -p 8000:8000 --env-file backend/deploy/.env.example parking-control-backend:dev`

## CI/CD
- GitLab: `.gitlab-ci.yml` — стадии `test` (pytest с in-memory SQLite) и `build` (сборка/пуш образа в `$CI_REGISTRY_IMAGE/backend`).
- GitHub: workflows для CI/CD сохранены в `.github/workflows/` (можно удалить, если не нужны).
