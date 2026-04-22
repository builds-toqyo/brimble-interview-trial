# Brimble take-home — deployment pipeline

A single-page deployment pipeline: paste a Git URL, watch it build, get a running container fronted by Caddy.

> **Status:** control-plane (UI + API + Caddy ingress) is wired end-to-end. The build-and-run pipeline itself is currently a mock. See [What's done / what's not](#whats-done--whats-not) below for the honest breakdown.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Vite 8 + TanStack Start (Router + Query) + Tailwind 4 + React 19 | Task requires Vite + TanStack. Start gives SSR + file-based routing out of the box. |
| Backend | TypeScript + Express, `tsx` in dev | Small, explicit, easy to read in 6 months. |
| Build system | **Railpack** (planned — see gap list) | Task requirement. No handwritten Dockerfiles for user apps. |
| Container runtime | Docker (via `/var/run/docker.sock` bind-mount) | Task requirement. |
| Ingress | Caddy 2 with admin API on `:2019` | Dynamic route injection per deployment. |
| State | In-memory (should be SQLite) | Simple for the demo; persistence is a known gap. |
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
                ┌──────────────┐
 user ─────►    │  Caddy :80   │  ◄── single ingress
                └──┬────────┬──┘
                   │        │
         / (html)  │        │  /api/*
                   ▼        ▼
         ┌─────────────┐  ┌──────────────┐
         │  frontend   │  │   backend    │
         │  Vite 3000  │  │  Express 3001│
         └─────────────┘  └──────┬───────┘
                                 │ docker.sock + Caddy admin API
                                 ▼
                        ┌────────────────┐
                        │ deployed apps  │  (one container per deployment)
                        │  :4000, :4001…  │
                        └────────────────┘
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
└── sample-app/                 # a tiny Node service to deploy against the pipeline
```

---

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/deployments` | List deployments |
| `POST` | `/api/deployments` | Create `{ gitUrl }` → returns `Deployment` |
| `GET` | `/api/deployments/:id/logs` | SSE stream of build + container logs |

Deployment lifecycle: `pending → building → deploying → running | failed`.

---

## What's done / what's not

Honest, because the spec rewards honesty over polish.

### ✅ Done
- Vite + TanStack (Router + Query) one-pager with form, list, status badges, SSE log drawer.
- Single `docker compose up` brings up frontend, backend, Caddy.
- Multi-stage Dockerfiles for the control plane (these are **not** the "handwritten Dockerfile for user apps" that the spec forbids — those are what Railpack is for).
- SSE endpoint and client wiring. Logs persist for the lifetime of the backend process and replay on re-open.
- Caddy ingress fronting the whole system.

### ⚠️ Stubbed / missing — would finish with another weekend

1. **Railpack integration.** The backend currently fakes the build with `setTimeout`. The real flow is:
   `git clone <gitUrl>` → `railpack build --name brimble-app-<id>` (pipe stdout/stderr into the log store) → resolve the built image tag → `docker run -d -p <port>:<exposed> brimble-app-<id>`.
2. **Real container logs.** Once a container is running, attach `docker logs --follow <id>` and pipe into the same SSE stream.
3. **Dynamic Caddy routes.** On `running`, `POST` to `http://caddy:2019/config/apps/http/servers/srv0/routes/...` to add a reverse_proxy for `app-<id>.localhost` → `host.docker.internal:<port>`.
4. **SQLite persistence.** Swap the in-memory arrays for a tiny `better-sqlite3` (or `bun:sqlite`) store so deployments + logs survive restarts and users can scroll back.
5. **Brimble deploy + feedback write-up** — separate task, not yet submitted.

### Bonus not attempted
- Rollback to previous image tag
- Build-cache reuse
- Zero-downtime redeploy

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

*(Pending — will be added before submission.)*
