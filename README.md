# Gaia Metadata v0.3.4

Console di gestione campagne oceanografiche — R/V Gaia Blu  
**GdL Dati Gaia Bu - CNR**

## Stack

| Componente | Tecnologia |
|------------|------------|
| Backend | Python 3.12 + FastAPI |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | PostgreSQL 16 |
| Deploy | Docker + docker-compose |

## Avvio rapido

```bash
# 1. Copia e configura le variabili d'ambiente
cp .env.example .env
# Modifica .env con la SECRET_KEY e gli indirizzi corretti

# 2. Build e avvio
docker-compose up -d --build

# 3. L'interfaccia è disponibile su http://localhost:8088
```

## Credenziali default

| Username | Password | Ruolo |
|----------|----------|-------|
| `admin` | `gaiaadmin` | admin |

> **Cambiare la password admin alla prima login!**

## Variabili d'ambiente chiave

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `SECRET_KEY` | changeme | JWT secret — usare `openssl rand -hex 32` |
| `NMEA_HOST` | 127.0.0.1 | Host gaia-acquisition ingestor |
| `NMEA_PORT` | 10115 | Porta UDP gaia-acquisition |
| `GAIA_ACQUISITION_URL` | http://localhost:8080 | URL REST gaia-acquisition |
| `APP_PORT` | 8088 | Porta esposta su host |

## Struttura progetto

```
gaia-metadata/
├── backend/
│   ├── app/
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── routers/     # FastAPI routers (auth, cruises, tasks, instruments, users)
│   │   ├── services/    # NMEA sender, position fetcher, export
│   │   └── core/        # Auth helpers, DB seed
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/       # Dashboard, Cruises, Instruments, Users
│       ├── components/  # Layout, Modal, Badge, Btn...
│       ├── api/         # Axios API clients
│       └── context/     # AuthContext
└── docker-compose.yml
```

## API REST

Documentazione Swagger disponibile su: `http://localhost:8088/api/docs`

Endpoint principali:
- `POST /api/v1/auth/token` — login
- `GET/POST /api/v1/cruises/` — gestione campagne
- `POST /api/v1/tasks/` — avvio task
- `POST /api/v1/tasks/{id}/operations` — registra operazione
- `POST /api/v1/tasks/{id}/abort` — annulla task
- `GET /api/v1/cruises/{id}/export/csv` — export CSV
- `GET /api/v1/cruises/{id}/export/json` — export JSON

## Integrazione gaia-acquisition

Ad ogni evento il sistema invia automaticamente sentenze `$PGBEV` via UDP:
- Avvio task → `$PGBEV,...,START`
- Operazione → `$PGBEV,...,<NOME_OPERAZIONE>`
- Chiusura task → `$PGBEV,...,END`
- Annullamento → `$PGBEV,...,ABORT`

La posizione viene letta automaticamente da (singola chiamata, risposta con tutti i campi):
```
GET http://<GAIA_ACQUISITION_URL>/api/v1/live/navigation/Seapath/GPGGA
```

## Upgrade da versione precedente

Se hai una installazione pre-esistente di gaia-metadata nella directory `./backend`,
**rimuovi i vecchi file Python prima di ricostruire**:
```bash
# Dalla directory gaia-metadata/
find backend/ -maxdepth 1 -name "*.py" -delete   # rimuove main.py, session.py, ecc. vecchi
docker-compose down
docker-compose up -d --build
```

## Strumenti precaricati

| Strumento | Tipo | Operazioni |
|-----------|------|------------|
| CTD / Rosetta | Puntuale | Inizio cast → Max profondità → Fine cast |
| Multibeam MBES | Transetto | Inizio linea → Fine linea |
| ADCP | Transetto | Inizio → Fine transetto |
| ROV | Puntuale | In acqua → Su fondale → Off bottom → A bordo |
| Drifter / Argo Float | Puntuale | Rilascio |
| FerryBox | Transetto | Inizio → Fine acquisizione |

## Changelog

### v0.3.4
- Versione iniziale
- Gestione campagne (CRUD, stati: pianificata/attiva/conclusa)
- Cruscotto task real-time con auto-refresh
- Chiusura automatica task all'ultima operazione
- Invio $PGBEV a gaia-acquisition
- Posizione auto da gaia-acquisition REST API
- Export CSV e JSON per campagna
- Import campagne da CSV
- Gestione utenti con ruoli (admin, capo_missione, operatore)
- 6 strumenti preconfigurati con operazioni standard
