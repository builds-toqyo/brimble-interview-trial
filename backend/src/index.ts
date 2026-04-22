import express from 'express'
import cors from 'cors'
import { DeploymentController } from './controllers/deployment.controller'
import { errorHandler, notFoundHandler, requestLogger } from './middleware/error.middleware'
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

// Middleware
app.use(cors())
app.use(express.json())
app.use(requestLogger)

// Controllers
const deploymentController = new DeploymentController()

// Basic deployment routes
app.get('/api/deployments', (req, res) => deploymentController.getAll(req, res))
app.post('/api/deployments', (req, res) => deploymentController.create(req, res))
app.get('/api/deployments/:id', (req, res) => deploymentController.getById(req, res))
app.post('/api/deployments/:id/rollback', (req, res) => deploymentController.rollback(req, res))
app.get('/api/deployments/:id/versions', (req, res) => deploymentController.getVersions(req, res))
app.get('/api/deployments/:id/logs', (req, res) => deploymentController.getLogs(req, res))

// Advanced features routes (keeping existing functionality)
app.post('/api/deployments/:id/schedule-rollback', (req, res) => {
  const { id } = req.params
  const { targetVersion, scheduledAt, reason } = req.body
  
  if (!targetVersion || !scheduledAt) {
    return res.status(400).json({ error: 'targetVersion and scheduledAt are required' })
  }
  
  try {
    const result = scheduledRollbackService.scheduleRollback(id, targetVersion, scheduledAt, reason)
    res.json({ message: 'Rollback scheduled successfully', id: result })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.get('/api/deployments/:id/scheduled-rollbacks', (req, res) => {
  try {
    const rollbacks = scheduledRollbackService.getScheduledRollbacks(req.params.id)
    res.json({ data: rollbacks })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/deployments/:id/traffic-split', (req, res) => {
  const { id } = req.params
  const { versionA, versionB, weightA } = req.body
  
  if (!versionA || !versionB || weightA === undefined) {
    return res.status(400).json({ error: 'versionA, versionB, and weightA are required' })
  }
  
  try {
    const result = trafficSplitService.createSplit(id, versionA, versionB, weightA)
    res.json({ message: 'Traffic split created successfully', id: result })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/traffic-splits/:splitId/activate', (req, res) => {
  const { splitId } = req.params
  const { deploymentId } = req.body
  
  if (!deploymentId) {
    return res.status(400).json({ error: 'deploymentId is required' })
  }
  
  try {
    trafficSplitService.activateSplit(splitId, deploymentId)
    res.json({ message: 'Traffic split activated successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.put('/api/traffic-splits/:splitId/weights', (req, res) => {
  const { splitId } = req.params
  const { weightA, weightB } = req.body
  
  if (weightA === undefined || weightB === undefined) {
    return res.status(400).json({ error: 'weightA and weightB are required' })
  }
  
  try {
    trafficSplitService.updateWeights(Number(splitId), weightA, weightB)
    res.json({ message: 'Traffic split weights updated successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.get('/api/regions', (req, res) => {
  try {
    const regions = multiRegionService.getRegions()
    res.json({ data: regions })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/regions', (req, res) => {
  const { name, endpoint, regionCode } = req.body
  
  if (!name || !endpoint || !regionCode) {
    return res.status(400).json({ error: 'name, endpoint, and regionCode are required' })
  }
  
  try {
    const result = multiRegionService.createRegion(name, endpoint, regionCode)
    res.json({ message: 'Region created successfully', id: result })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/deployments/:id/deploy-to-region', (req, res) => {
  const { id } = req.params
  const { regionId, version } = req.body
  
  if (!regionId || !version) {
    return res.status(400).json({ error: 'regionId and version are required' })
  }
  
  try {
    const result = multiRegionService.deployToRegion(id, Number(regionId), version)
    res.json({ message: 'Deployment to region initiated successfully', id: result })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.get('/api/deployments/:id/regions', (req, res) => {
  try {
    const regions = multiRegionService.getDeploymentRegions(req.params.id)
    res.json({ data: regions })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/deployments/:id/health-check', (req, res) => {
  const { id } = req.params
  const { version, endpointPath, method, expectedStatus, timeoutMs, intervalMs } = req.body
  
  if (!version) {
    return res.status(400).json({ error: 'version is required' })
  }
  
  try {
    const result = healthCheckService.startHealthCheck(id, version, {
      endpointPath,
      method,
      expectedStatus,
      timeoutMs,
      intervalMs
    })
    res.json({ message: 'Health check started successfully', id: result })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.get('/api/deployments/:id/health-checks', (req, res) => {
  try {
    const checks = healthCheckService.getHealthChecks(req.params.id)
    res.json({ data: checks })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/optimize/database', (req, res) => {
  try {
    databaseOptimizationService.optimizeQueries()
    res.json({ message: 'Database optimization completed successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze-performance', (req, res) => {
  try {
    databaseOptimizationService.analyzePerformance()
    res.json({ message: 'Performance analysis completed successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/deployments/:id/performance/optimize', (req, res) => {
  const { id } = req.params
  
  try {
    databaseOptimizationService.optimizeQueries()
    res.json({ message: 'Performance optimization completed successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

// Start services
scheduledRollbackService.start()
healthCheckService.startAllHealthChecks()

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Brimble backend server running on port ${port}`)
  })
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  scheduledRollbackService.stop()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...')
  scheduledRollbackService.stop()
  process.exit(0)
})

// Export the app for testing
export default app
