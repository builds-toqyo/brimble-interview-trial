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
  const url = new URL(path, CADDY_ADMIN)
  const data = JSON.stringify(body)
  
  return new Promise((resolve, reject) => {
    const req = require('http').request({
      // url.hostname will be 'caddy'
      hostname: url.hostname,
      port: url.port || 2019,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        // Explicitly set Host to match the service name
        'Host': url.hostname,
      },
    }, (res: any) => {
      let responseData = ''
      res.on('data', (chunk: any) => responseData += chunk)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve()
        } else {
          reject(new Error(`Caddy ${path} -> ${res.statusCode}: ${responseData}`))
        }
      })
    })
    
    // Improved error logging for DNS issues
    req.on('error', (err: any) => {
      reject(new Error(`Failed to connect to Caddy at ${CADDY_ADMIN}: ${err.message}`))
    })
    
    req.write(data)
    req.end()
  })
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
