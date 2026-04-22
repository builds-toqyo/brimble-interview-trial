/**
 * Caddy admin API client.
 *
 * We POST to `/config/apps/http/servers/srv0/routes/...` on the running
 * Caddy instance to add a reverse_proxy route per deployment, without
 * touching the Caddyfile.
 *
 * Route shape: path prefix `/apps/<id>/*` → reverse_proxy to the backend
 * network address `host.docker.internal:<port>` (the app port exposed on
 * the host by `docker run -p`).
 */

const CADDY_ADMIN = process.env.CADDY_ADMIN_URL || 'http://caddy:2019'

async function post(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${CADDY_ADMIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(
      `Caddy ${path} -> ${res.status}: ${await res.text().catch(() => '')}`,
    )
  }
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${CADDY_ADMIN}${path}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    throw new Error(
      `Caddy DELETE ${path} -> ${res.status}: ${await res
        .text()
        .catch(() => '')}`,
    )
  }
}

function routeId(deploymentId: string): string {
  return `deployment-${deploymentId}`
}

/**
 * Insert a route at the head of `srv0.routes` so it wins over the catch-all
 * that points at the frontend.
 */
export async function addDeploymentRoute(
  deploymentId: string,
  hostPort: number,
): Promise<void> {
  const route = {
    '@id': routeId(deploymentId),
    match: [{ path: [`/apps/${deploymentId}/*`] }],
    handle: [
      {
        handler: 'rewrite',
        strip_path_prefix: `/apps/${deploymentId}`,
      },
      {
        handler: 'reverse_proxy',
        upstreams: [{ dial: `host.docker.internal:${hostPort}` }],
      },
    ],
  }
  // Prepend to routes array so path match wins over the catch-all.
  await post('/config/apps/http/servers/srv0/routes/', route)
}

export async function removeDeploymentRoute(deploymentId: string): Promise<void> {
  await del(`/id/${routeId(deploymentId)}`)
}

export function publicUrlFor(deploymentId: string): string {
  const base = process.env.PUBLIC_INGRESS_URL || 'http://localhost'
  return `${base}/apps/${deploymentId}/`
}
