# Brimble - Real Deployment Pipeline

A complete one-page deployment pipeline with Railpack: paste a Git URL, watch it build with real logs, get a running container fronted by Caddy.

> **Status:** Fully functional end-to-end pipeline with Railpack + BuildKit + Docker + Caddy + SQLite persistence.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Vite 8 + TanStack Start (Router + Query) + Tailwind 4 + React 19 | Task requires Vite + TanStack. Start gives SSR + file-based routing out of the box. |
| Backend | TypeScript + Express, `tsx` in dev | Small, explicit, easy to read in 6 months. |
| Build system | **Railpack** + BuildKit | Zero-config container builds without handwritten Dockerfiles. |
| Container runtime | Docker (via `/var/run/docker.sock` bind-mount) | Task requirement. |
| Ingress | Caddy 2 with admin API on `:2019` | Dynamic route injection per deployment. |
| State | SQLite with better-sqlite3 | Persistent deployments and logs across restarts. |
| Log streaming | SSE (`EventSource`) | Simpler than WS for one-way log tailing. |

---

## Quick start

```bash
docker compose up --build
```

Then open:

- **http://localhost:3000** — frontend (direct)
- **http://localhost** — Caddy ingress (fronts frontend + proxies `/api/*` to backend)
- **http://localhost:3001/api/deployments** — backend API
- **http://localhost:2019** — Caddy admin API (used to add deployment routes)

No env vars, no accounts, no prerequisites beyond Docker.

---

## Architecture

```
                +----------------+
 user ++++++>    |  Caddy :80   |  +--+ single ingress
                +--+--------+--+
                   |        |
         / (html)  |        |  /api/*
                   +        +
         +---------+  +-------------------+
         |  frontend   |  |     backend     |
         |  Vite 3000  |  |  Express 3001  |
         +---------+  +-----+------------+
                                 | docker.sock + Caddy admin API
                                 +-----+--------+
                                       |
                                       + BuildKit (docker-container://buildkit)
                                       |
                        +------------------------------+
                        |        Railpack Builds      |
                        |  git clone + mise + npm ci   |
                        +------------------------------+
                                       |
                        +------------------------------+
                        |      Docker Containers       |
                        |  :4000, :4001, :4002...       |
                        +------------------------------+
```

Caddy fronts everything on port 80. Each successful deployment asks Caddy's admin API to add a route (by path prefix `/apps/<id>/*` or subdomain `app-<id>.localhost`) that reverse-proxies to the deployment's container.

---

## Repo layout

```
.
├── docker-compose.yml          # brings up frontend + backend + caddy
├── frontend/                   # TanStack Start app
│   ├── src/routes/
│   │   ├── __root.tsx         # QueryClientProvider + shell
│   │   └── index.tsx          # the one page: form + list + SSE logs
│   ├── vite.config.ts          # dev server + /api proxy to backend
│   └── Dockerfile              # multi-stage, node:22-alpine
├── backend/
│   ├── src/index.ts            # Express API + SSE log streaming
│   └── Dockerfile              # multi-stage, node:22-alpine
├── caddy/
│   ├── Caddyfile               # static routes for frontend/backend
│   └── sites/                  # dynamic per-deployment snippets (imported)
```

---

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/deployments` | List deployments |
| `POST` | `/api/deployments` | Create `{ gitUrl }` → returns `Deployment` |

### + Pipeline Flow
1. User submits Git URL via frontend
2. Backend clones repository to workspace
3. Railpack builds container image using BuildKit
4. Docker runs container with exposed port mapping
5. Caddy registers route `/apps/<id>/` pointing to container
6. Container logs stream via SSE
7. Deployment status updates in real-time

---

## Testing

### + Quick Test (Express.js)
```bash
# Deploy a real Node.js application
curl -s -X POST http://localhost:3001/api/deployments \
  -H 'Content-Type: application/json' \
  -d '{"gitUrl":"https://github.com/expressjs/express.git"}' \
  | jq -r .id

# Watch the logs
curl -s http://localhost:3001/api/deployments/<id>/logs

# Access the deployed app
open http://localhost/apps/<id>/
```

### + UI Test
1. Open http://localhost:3000
2. Enter Git URL: `https://github.com/expressjs/express.git`
3. Click "Deploy"
4. Watch real-time logs in the drawer
5. See status update to "running"
6. Click the live URL to access the deployed app

### + API Test
```bash
# List all deployments
curl -s http://localhost:3001/api/deployments | jq .

# Get specific deployment
curl -s http://localhost:3001/api/deployments/<id> | jq .

# Stream logs (SSE)
curl -s http://localhost:3001/api/deployments/<id>/logs
```

### + Verification Commands
```bash
# Check BuildKit connectivity
docker compose exec backend ping buildkit

# Verify Caddy routes
curl -s http://localhost:2019/config/apps/http/servers/srv0/routes | jq .

# Check running containers
docker ps --filter "name=brimble-app"

# View SQLite data
docker compose exec backend sqlite3 /app/data/deployments.db \
  "SELECT id, status, host_port, live_url FROM deployments;"
```

---

## Automation & Dockerfile Integration

All manual setup steps have been automated:

### + Dockerfile Automation
- **Mise Installation**: Pre-installed and symlinked in Dockerfile
- **Railpack Setup**: Automatically installed and configured
- **BuildKit Integration**: Environment variables set in docker-compose.yml
- **Network Configuration**: Dedicated `brimble-net` for service communication

### + Why Not Shell Scripts?
The pipeline logic lives in TypeScript (`pipeline.ts`) rather than shell scripts because:
- **Error Handling**: Proper try/catch with detailed error messages
- **Type Safety**: Compile-time validation of deployment data
- **Streaming**: SSE integration for real-time log streaming
- **State Management**: SQLite persistence with proper migrations
- **API Integration**: Caddy admin API calls with proper error handling

### + Key Technical Decisions
- **Debian over Alpine**: Fixed glibc compatibility issues with mise/Railpack binaries
- **BuildKit Container**: Dedicated privileged container for build operations
- **Caddy Admin API**: Dynamic route registration without config reloads
- **SQLite Persistence**: Better-sqlite3 for synchronous database operations
- **Docker Socket Mount**: Direct Docker API access for container management

---

## Design choices worth calling out

- **TanStack Start over plain Vite SPA.** The job spec asks for Vite + TanStack. Start gives file-based routing, SSR-on-demand, and the official Query integration without reinventing any of it. Falls back cleanly to SPA if SSR breaks.
- **SSE over WebSocket.** Logs are one-way, append-only. SSE reconnects for free, works through any HTTP proxy (including Caddy), and is 10 lines on the client and server.
- **Caddy admin API instead of regenerating Caddyfiles.** No reloads, no file-watching. The backend just POSTs JSON to `:2019` when a deployment becomes `running`.
- **Docker-in-Docker via socket mount, not DinD image.** Lower overhead, the control plane is just a Node process that shells out to `docker` and `railpack`.
- **No auth.** Spec says skip it.
- **Multi-stage control-plane Dockerfiles.** `builder` installs deps + does any tsc step; `runner` copies just what ships. Builds are cached on `package*.json` copy.

## What I'd rip out or change

- Replace `tsx watch` in the runner stage with a compiled `node dist/index.js` — dev convenience shouldn't ship.
- Move the backend off Express once there's a second route group; Hono or Fastify both have better SSE primitives.
- Drop the TanStack Start SSR if the deployed app has no SEO needs — SPA is smaller and doesn't hit the "QueryClient must exist server-side" class of bug.

---

## Time spent

Rough: ~1 weekend so far on scaffold + UI + ingress. Would need another focused day for Railpack + real Docker execution + dynamic Caddy routes, and an evening for the SQLite migration and the Brimble deploy feedback.

---

## Brimble deploy feedback
