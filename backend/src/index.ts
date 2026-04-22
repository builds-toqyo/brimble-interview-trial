import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import type { Request, Response } from 'express'
import {
  insertDeployment,
  listDeployments,
  getDeployment,
  getLogs,
  getDeploymentVersions,
  getCurrentVersion,
  getPreviousVersion,
} from './db'
import { bus } from './events'
import { runDeployment, rollbackDeployment } from './pipeline'
import {
  scheduledRollbackService,
  trafficSplitService,
  multiRegionService,
  healthCheckService,
  parallelBuildService,
  imageOptimizationService,
  databaseOptimizationService
} from './advanced'

const app = express()
const port = Number(process.env.PORT) || 3001

app.use(cors())
app.use(express.json())

app.get('/api/deployments', (_req, res) => {
  res.json(listDeployments())
})

app.post('/api/deployments', (req: Request, res: Response) => {
  const { gitUrl, projectName } = (req.body ?? {}) as {
    gitUrl?: string
    projectName?: string
  }
  if (!gitUrl && !projectName) {
    return res.status(400).json({ error: 'gitUrl or projectName is required' })
  }

  const id = uuidv4()
  insertDeployment({
    id,
    git_url: gitUrl ?? null,
    project_name: projectName ?? null,
  })

  // Kick off the pipeline in the background. Errors are captured
  // inside runDeployment and surfaced as failed status + log lines.
  if (gitUrl) {
    runDeployment(id, gitUrl).catch((err) => {
      console.error(`pipeline crashed for ${id}`, err)
    })
  }

  res.status(201).json(getDeployment(id))
})

app.get('/api/deployments/:id', (req, res) => {
  const d = getDeployment(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  res.json(d)
})

app.get('/api/deployments/:id/logs', (req: Request, res: Response) => {
  const { id } = req.params
  if (!getDeployment(id)) return res.status(404).end()

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders?.()

  // Replay persisted logs, then subscribe to new ones.
  for (const line of getLogs(id)) {
    res.write(`data: ${line}\n\n`)
  }

  const onLog = (line: string) => {
    res.write(`data: ${line}\n\n`)
  }
  const onStatus = (status: string) => {
    res.write(`event: status\ndata: ${status}\n\n`)
  }

  bus.on(`log:${id}`, onLog)
  bus.on(`status:${id}`, onStatus)

  // Heartbeat so proxies don't close the connection.
  const heartbeat = setInterval(() => res.write(`: ping\n\n`), 15_000)

  req.on('close', () => {
    clearInterval(heartbeat)
    bus.off(`log:${id}`, onLog)
    bus.off(`status:${id}`, onStatus)
    res.end()
  })
})

app.get('/api/deployments/:id/versions', (req, res) => {
  const d = getDeployment(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  
  const versions = getDeploymentVersions(req.params.id)
  const current = getCurrentVersion(req.params.id)
  const previous = getPreviousVersion(req.params.id)
  
  res.json({
    versions,
    current,
    previous,
    canRollback: !!previous
  })
})

app.post('/api/deployments/:id/rollback', async (req, res) => {
  const d = getDeployment(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  
  const previous = getPreviousVersion(req.params.id)
  if (!previous) {
    return res.status(400).json({ error: 'No previous version available for rollback' })
  }
  
  try {
    await rollbackDeployment(req.params.id)
    res.json({ message: 'Rollback initiated', previousVersion: previous })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Scheduled Rollback endpoints
app.post('/api/deployments/:id/schedule-rollback', (req, res) => {
  const { targetVersion, scheduledAt, reason } = req.body
  const deploymentId = req.params.id
  
  if (!targetVersion || !scheduledAt) {
    return res.status(400).json({ error: 'targetVersion and scheduledAt are required' })
  }
  
  try {
    const id = scheduledRollbackService.scheduleRollback(deploymentId, targetVersion, scheduledAt, reason)
    res.json({ message: 'Rollback scheduled', id })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.get('/api/deployments/:id/scheduled-rollbacks', (req, res) => {
  const rollbacks = scheduledRollbackService.getScheduledRollbacks(req.params.id)
  res.json(rollbacks)
})

// Traffic Split endpoints
app.post('/api/deployments/:id/traffic-split', (req, res) => {
  const { versionA, versionB, weightA } = req.body
  const deploymentId = req.params.id
  
  if (!versionA || !versionB) {
    return res.status(400).json({ error: 'versionA and versionB are required' })
  }
  
  try {
    const id = trafficSplitService.createSplit(deploymentId, versionA, versionB, weightA)
    res.json({ message: 'Traffic split created', id })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.post('/api/traffic-splits/:id/activate', async (req, res) => {
  const { deploymentId } = req.body
  const splitId = parseInt(req.params.id)
  
  try {
    await trafficSplitService.activateSplit(deploymentId, splitId)
    res.json({ message: 'Traffic split activated' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.post('/api/traffic-splits/:id/deactivate', async (req, res) => {
  const { deploymentId } = req.body
  const splitId = parseInt(req.params.id)
  
  try {
    await trafficSplitService.deactivateSplit(deploymentId, splitId)
    res.json({ message: 'Traffic split deactivated' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.put('/api/traffic-splits/:id/weights', (req, res) => {
  const { weightA, weightB } = req.body
  const splitId = parseInt(req.params.id)
  
  if (!weightA || !weightB) {
    return res.status(400).json({ error: 'weightA and weightB are required' })
  }
  
  try {
    trafficSplitService.updateWeights(splitId, weightA, weightB)
    res.json({ message: 'Weights updated' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Region endpoints
app.post('/api/regions', (req, res) => {
  const { name, endpoint, regionCode } = req.body
  
  if (!name || !endpoint || !regionCode) {
    return res.status(400).json({ error: 'name, endpoint, and regionCode are required' })
  }
  
  try {
    const id = multiRegionService.createRegion(name, endpoint, regionCode)
    res.json({ message: 'Region created', id })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.get('/api/regions', (req, res) => {
  const regions = multiRegionService.getRegions()
  res.json(regions)
})

app.post('/api/deployments/:id/deploy-to-region', async (req, res) => {
  const { regionId, version } = req.body
  const deploymentId = req.params.id
  
  if (!regionId || !version) {
    return res.status(400).json({ error: 'regionId and version are required' })
  }
  
  try {
    const id = await multiRegionService.deployToRegion(deploymentId, regionId, version)
    res.json({ message: 'Deployed to region', id })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.get('/api/deployments/:id/regions', (req, res) => {
  const regions = multiRegionService.getDeploymentRegions(req.params.id)
  res.json(regions)
})

// Health Check endpoints
app.post('/api/deployments/:id/health-check', (req, res) => {
  const { version, endpointPath, method, expectedStatus, timeoutMs, intervalMs } = req.body
  const deploymentId = req.params.id
  
  if (!version) {
    return res.status(400).json({ error: 'version is required' })
  }
  
  try {
    const id = healthCheckService.startHealthCheck(deploymentId, version, {
      endpointPath,
      method,
      expectedStatus,
      timeoutMs,
      intervalMs
    })
    res.json({ message: 'Health check started', id })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.get('/api/deployments/:id/health-checks', (req, res) => {
  const checks = healthCheckService.getHealthChecks(req.params.id)
  res.json(checks)
})

// Performance optimization endpoints
app.post('/api/optimize/database', (req, res) => {
  try {
    databaseOptimizationService.optimizeQueries()
    res.json({ message: 'Database optimization completed' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.post('/api/analyze-performance', (req, res) => {
  try {
    databaseOptimizationService.analyzePerformance()
    res.json({ message: 'Performance analysis completed' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.get('/api/active-builds', (req, res) => {
  const activeBuilds = parallelBuildService.getActiveBuilds()
  res.json({ activeBuilds })
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// Start advanced services
app.listen(port, '0.0.0.0', () => {
  console.log(`backend listening on :${port}`)
  
  // Start advanced services
  scheduledRollbackService.start()
  healthCheckService.startAllHealthChecks()
  databaseOptimizationService.optimizeQueries()
  
  console.log('Advanced services started')
})
