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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`backend listening on :${port}`)
})
