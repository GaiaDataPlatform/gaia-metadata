# gaia-metadata — Note operative e stato sviluppo

**Versione corrente:** 0.3.4  
**Autore:** Rocco De Marco - IRBIM CNR - Ancona
**Ultimo aggiornamento:** marzo 2026  
**Piattaforma:** R/V Gaia Blu — CNR

---

## Cosa fa

gaia-metadata è una web console per la gestione delle campagne oceanografiche a bordo della R/V Gaia Blu. Permette di:

- Creare e gestire campagne (cruise) con metadati associati
- Avviare e tracciare task scientifici (CTD, MBES, ADCP, ROV, Drifter, FerryBox) con le relative operazioni
- Notificare in tempo reale gli eventi a **gaia-acquisition** tramite sentenze NMEA proprietarie `$PGBEV` su UDP
- Recuperare la posizione GPS live da gaia-acquisition per georeferenziare automaticamente i task
- Esportare il log delle attività in CSV e JSON

---

## Stack tecnico

| Componente | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI (async) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | PostgreSQL 16 |
| Deploy | Docker + docker-compose |

---

## Architettura di deploy

```
Browser
  │
  ▼
gaia-metadata-ui (nginx :80)
  │  proxy /api/v1 →
  ▼
gaia-metadata-api (uvicorn :8000)
  │  async ORM →
  ▼
gaia-metadata-db (postgres :5432)

gaia-metadata-api
  │  UDP $PGBEV →  172.17.0.1:10115
  ▼
gaia-acq-ingestor  (network_mode: host)
  │
  ▼
InfluxDB (misura: event)
```

---

## Integrazione con gaia-acquisition

### Sentenze NMEA inviate

**`$PGBEV`** — inviata ad ogni evento task (START, operazione intermedia, END, ABORT):

```
$PGBEV,<event>,<task_id>,<cruise_code>,<lat>,<lon>*<checksum>
```

Campi registrati in InfluxDB (misura `event`):

| Campo | Contenuto |
|---|---|
| `sentence_type` | `PGBEV` |
| `source_id` | `Gaia Metadata` |
| `cruise` | codice campagna (es. `GB2601`) |
| `event` | nome evento (es. `START_CAST`, `END`) |
| `event_time` | timestamp UTC |
| `operator` | username dell'utente |
| `tasktype` | tipo strumento (es. `CTD`) |

### Configurazione richiesta in gaia-acquisition

L'ingestor deve avere una sorgente UDP configurata come:

- **Tipo:** unicast (o broadcast)
- **Indirizzo:** `0.0.0.0`
- **Porta:** `10115`

### Recupero posizione

gaia-metadata interroga la REST API di gaia-acquisition per ottenere la posizione GPS live al momento della creazione di ogni task e operazione:

```
GET /api/v1/live/navigation/Seapath/GPGGA
```

Se l'API non è raggiungibile il task viene creato comunque, senza coordinate.

---

## Variabili d'ambiente (.env)

```ini
POSTGRES_USER=gaia
POSTGRES_PASSWORD=<password>
POSTGRES_DB=gaia_metadata

SECRET_KEY=<openssl rand -hex 32>
ACCESS_TOKEN_EXPIRE_MINUTES=525600   # ~1 anno, sessione persistente

# gaia-acquisition — NMEA UDP
# IMPORTANTE: usare l'IP del bridge Docker, NON 127.0.0.1
# Sul host Linux il gateway del bridge default è tipicamente 172.17.0.1
# Verificare con: ip route | grep docker
NMEA_HOST=172.17.0.1
NMEA_PORT=10115

# gaia-acquisition — REST API (per posizione GPS live)
GAIA_ACQUISITION_URL=http://host.docker.internal:8080

APP_PORT=8088
VESSEL_NAME=Gaia Blu
```

---

## Ruoli utente

| Ruolo | Permessi |
|---|---|
| `admin` | tutto: utenti, strumenti, campagne, task |
| `capo_missione` | campagne e task (no utenti, no strumenti) |
| `operatore` | solo task sulla campagna attiva |

Utente di default al primo avvio: `admin` / `gaiaadmin` — **cambiare la password subito**.

---

## Strumenti preconfigurati (seed)

| Nome | Tipo | Operazioni |
|---|---|---|
| CTD / Rosette | point | Start cast → Max depth → End cast |
| Multibeam (MBES) | transect | Line start → Line end |
| ADCP (VM-ADCP) | transect | Transect start → Transect end |
| ROV | point | In water → On bottom → Off bottom → On deck |
| Drifter / Argo Float | point | Deployment |
| FerryBox | transect | Acquisition start → Acquisition end |

---

## Procedura di aggiornamento

```bash
# 1. Backup .env (non è nel pacchetto zip)
cp gaia-metadata/.env /tmp/gaia-metadata.env.bak

# 2. Swap directory
mv gaia-metadata gaia-metadata.bak
unzip gaia-metadata-vX.Y.Z.zip
cp /tmp/gaia-metadata.env.bak gaia-metadata/.env

# 3. Rebuild e riavvio
cd gaia-metadata
docker compose down
docker compose up -d --build

# Il volume pgdata persiste — nessun dato viene perso
```

---

## Cose note da completare / migliorare

### Priorità alta

- **Posizione GPS nei task:** attualmente fallisce con `All connection attempts failed` perché `host.docker.internal` non si risolve abbastanza velocemente (13s di latenza DNS rilevata). Valutare di usare direttamente l'IP `172.17.0.1` anche per `GAIA_ACQUISITION_URL`, oppure pre-resolvere l'IP all'avvio e cacharlo.

- **Gestione errori frontend:** gli errori API (es. 409 duplicate code, 403 forbidden) non vengono mostrati all'utente — il form si chiude silenziosamente. Aggiungere notifiche toast.

- **Autenticazione multi-utente reale:** attualmente un solo utente per volta (JWT senza revoca). In futuro considerare refresh token o sessioni server-side.

### Priorità media

- **Pagina strumenti — campi extra:** l'interfaccia per aggiungere/modificare `extra_fields` su uno strumento esistente non è ancora implementata. I campi extra si possono definire solo al momento della creazione via seed o API diretta.

- **Export completo campagna:** il JSON export include i task ma non le operazioni figlie con i loro `extra_data`. Utile per il report di fine campagna.

- **Paginazione task:** su campagne lunghe la pagina dettaglio carica tutti i task in una sola query. Aggiungere paginazione o virtualizzazione.

- **Importazione CSV campagne:** il parser è permissivo ma non valida le date — una data malformata causa un 500 silenzioso.

### Priorità bassa

- **`version:` in docker-compose.yml** di gaia-acquisition emette un warning ad ogni `docker compose` — rimuovere l'attributo obsoleto.

- **Reverse DNS lento** su `host.docker.internal` (13s rilevati). Aggiungere `options ndots:0` o un record statico in `/etc/hosts` del container.

- **Pagina di login:** nessun feedback visivo in caso di credenziali errate (l'errore arriva ma non viene mostrato).

- **ROV:** strumento presente nel seed ma ROV non ancora installato a bordo. Rivedere le operazioni quando le specifiche saranno disponibili.

---

## Storia versioni

| Versione | Note |
|---|---|
| 0.3.4 | Fix `require_role`, fix `pydantic[email]`, rimozione placeholder form, rimosso attributo `version` da docker-compose |
| 0.3.3 | Fix 500 su serializzazione email (`EmailStr` solo su input schema), rimozione placeholder |
| 0.3.2 | Traduzione UI in inglese, fix focus-loss nei form, date obbligatorie nelle campagne, fix NMEA_HOST Docker networking |
| 0.3.1 | Prima versione deployata a bordo |
