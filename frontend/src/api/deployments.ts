// API functions for deployments and advanced features

interface Deployment {
  id: string
  git_url: string | null
  project_name: string | null
  status: DeploymentStatus
  current_version: number | null
  container_id: string | null
  host_port: number | null
  live_url: string | null
  created_at: string
  updated_at: string
}

interface DeploymentVersion {
  id: number
  deployment_id: string
  version: number
  image_tag: string
  git_commit: string | null
  status: DeploymentStatus
  container_id: string | null
  host_port: number | null
  created_at: string
  updated_at: string
}

interface ScheduledRollback {
  id: number
  deployment_id: string
  target_version: number
  scheduled_at: string
  executed_at: string | null
  status: 'pending' | 'executed' | 'failed'
  reason: string | null
  created_at: string
}

interface TrafficSplit {
  id: number
  deployment_id: string
  version_a: number
  version_b: number
  weight_a: number
  weight_b: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

interface Region {
  id: number
  name: string
  endpoint: string
  region_code: string
  status: 'active' | 'inactive'
  created_at: string
}

interface DeploymentRegion {
  id: number
  deployment_id: string
  region_id: number
  version: number
  status: 'active' | 'inactive'
  endpoint_url: string
  created_at: string
  name: string
  region_code: string
}

interface HealthCheck {
  id: number
  deployment_id: string
  version: number
  endpoint_path: string
  method: 'GET' | 'POST'
  expected_status: number
  timeout_ms: number
  interval_ms: number
  status: 'healthy' | 'unhealthy' | 'unknown'
  last_check: string | null
  created_at: string
}

type DeploymentStatus = 'pending' | 'building' | 'deploying' | 'running' | 'failed' | 'stopping' | 'stopped'

// Basic deployment functions
export async function fetchDeployments(): Promise<Array<Deployment>> {
  const r = await fetch('/api/deployments')
  if (!r.ok) throw new Error('Failed to fetch deployments')
  const response = await r.json()
  return response.data || []
}

export async function createDeployment(data: {
  gitUrl?: string
  projectName?: string
}) {
  const r = await fetch('/api/deployments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed to create deployment')
  return r.json()
}

export async function fetchDeployment(id: string): Promise<Deployment> {
  const r = await fetch(`/api/deployments/${id}`)
  if (!r.ok) throw new Error('Failed to fetch deployment')
  return r.json()
}

export async function fetchVersions(deploymentId: string): Promise<{
  versions: DeploymentVersion[]
  current?: DeploymentVersion
  previous?: DeploymentVersion
  canRollback: boolean
}> {
  const r = await fetch(`/api/deployments/${deploymentId}/versions`)
  if (!r.ok) throw new Error('Failed to fetch versions')
  return r.json()
}

export async function rollbackDeployment(deploymentId: string): Promise<{
  message: string
  previousVersion: DeploymentVersion
}> {
  const r = await fetch(`/api/deployments/${deploymentId}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!r.ok) throw new Error('Failed to rollback deployment')
  return r.json()
}

// Advanced features API functions
export async function scheduleRollback(
  deploymentId: string,
  targetVersion: number,
  scheduledAt: string,
  reason?: string
): Promise<{ message: string; id: number }> {
  const r = await fetch(`/api/deployments/${deploymentId}/schedule-rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetVersion, scheduledAt, reason }),
  })
  if (!r.ok) throw new Error('Failed to schedule rollback')
  return r.json()
}

export async function getScheduledRollbacks(deploymentId: string): Promise<ScheduledRollback[]> {
  const r = await fetch(`/api/deployments/${deploymentId}/scheduled-rollbacks`)
  if (!r.ok) throw new Error('Failed to fetch scheduled rollbacks')
  return r.json()
}

export async function createTrafficSplit(
  deploymentId: string,
  versionA: number,
  versionB: number,
  weightA: number
): Promise<{ message: string; id: number }> {
  const r = await fetch(`/api/deployments/${deploymentId}/traffic-split`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionA, versionB, weightA }),
  })
  if (!r.ok) throw new Error('Failed to create traffic split')
  return r.json()
}

export async function activateTrafficSplit(
  splitId: number,
  deploymentId: string
): Promise<{ message: string }> {
  const r = await fetch(`/api/traffic-splits/${splitId}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deploymentId }),
  })
  if (!r.ok) throw new Error('Failed to activate traffic split')
  return r.json()
}

export async function updateTrafficSplitWeights(
  splitId: number,
  weightA: number,
  weightB: number
): Promise<{ message: string }> {
  const r = await fetch(`/api/traffic-splits/${splitId}/weights`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weightA, weightB }),
  })
  if (!r.ok) throw new Error('Failed to update traffic split weights')
  return r.json()
}

export async function getRegions(): Promise<Region[]> {
  const r = await fetch('/api/regions')
  if (!r.ok) throw new Error('Failed to fetch regions')
  return r.json()
}

export async function createRegion(
  name: string,
  endpoint: string,
  regionCode: string
): Promise<{ message: string; id: number }> {
  const r = await fetch('/api/regions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, endpoint, regionCode }),
  })
  if (!r.ok) throw new Error('Failed to create region')
  return r.json()
}

export async function deployToRegion(
  deploymentId: string,
  regionId: number,
  version: number
): Promise<{ message: string; id: number }> {
  const r = await fetch(`/api/deployments/${deploymentId}/deploy-to-region`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ regionId, version }),
  })
  if (!r.ok) throw new Error('Failed to deploy to region')
  return r.json()
}

export async function getDeploymentRegions(deploymentId: string): Promise<DeploymentRegion[]> {
  const r = await fetch(`/api/deployments/${deploymentId}/regions`)
  if (!r.ok) throw new Error('Failed to fetch deployment regions')
  return r.json()
}

export async function createHealthCheck(
  deploymentId: string,
  version: number,
  config: {
    endpointPath?: string
    method?: 'GET' | 'POST'
    expectedStatus?: number
    timeoutMs?: number
    intervalMs?: number
  }
): Promise<{ message: string; id: number }> {
  const r = await fetch(`/api/deployments/${deploymentId}/health-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, ...config }),
  })
  if (!r.ok) throw new Error('Failed to create health check')
  return r.json()
}

export async function getHealthChecks(deploymentId: string): Promise<HealthCheck[]> {
  const r = await fetch(`/api/deployments/${deploymentId}/health-checks`)
  if (!r.ok) throw new Error('Failed to fetch health checks')
  return r.json()
}

export async function optimizeDatabase(): Promise<{ message: string }> {
  const r = await fetch('/api/optimize/database', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!r.ok) throw new Error('Failed to optimize database')
  return r.json()
}

export async function analyzePerformance(): Promise<{ message: string }> {
  const r = await fetch('/api/analyze-performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!r.ok) throw new Error('Failed to analyze performance')
  return r.json()
}

export async function getLogs(deploymentId: string): Promise<string[]> {
  const r = await fetch(`/api/deployments/${deploymentId}/logs`)
  if (!r.ok) throw new Error('Failed to fetch logs')
  return r.json()
}
