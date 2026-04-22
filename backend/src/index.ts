import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

// In-memory storage for simplicity
const deployments: any[] = []
const deploymentLogs: Map<string, string[]> = new Map()

// Types
interface Deployment {
  id: string
  git_url?: string
  project_name?: string
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed'
  image_tag?: string
  live_url?: string
  container_id?: string
  created_at: string
  updated_at: string
}

// Helper functions
function addLog(deploymentId: string, log: string) {
  if (!deploymentLogs.has(deploymentId)) {
    deploymentLogs.set(deploymentId, [])
  }
  deploymentLogs.get(deploymentId)!.push(log)
}

function updateDeploymentStatus(id: string, status: string, updates: Partial<Deployment> = {}) {
  const deployment = deployments.find(d => d.id === id)
  if (deployment) {
    deployment.status = status as any
    deployment.updated_at = new Date().toISOString()
    Object.assign(deployment, updates)
  }
}

// API Routes
app.get('/api/deployments', (req, res) => {
  res.json(deployments)
})

app.post('/api/deployments', (req: any, res: any) => {
  const { gitUrl, projectName } = req.body
  
  const deployment: Deployment = {
    id: uuidv4(),
    git_url: gitUrl,
    project_name: projectName,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  deployments.push(deployment)
  addLog(deployment.id, `Deployment created for ${gitUrl || projectName}`)
  
  // Start processing in background
  processDeployment(deployment.id, gitUrl, projectName)
  
  res.json(deployment)
})

app.get('/api/deployments/:id/logs', (req: any, res: any) => {
  const { id } = req.params
  const logs = deploymentLogs.get(id) || []
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })
  
  // Send existing logs
  logs.forEach(log => {
    res.write(`data: ${log}\n\n`)
  })
  
  // Simulate real-time logs
  const interval = setInterval(() => {
    const currentLogs = deploymentLogs.get(id) || []
    const lastLog = currentLogs[currentLogs.length - 1]
    if (lastLog) {
      res.write(`data: ${lastLog}\n\n`)
    }
  }, 1000)
  
  req.on('close', () => {
    clearInterval(interval)
  })
})

// Mock deployment processing
async function processDeployment(deploymentId: string, gitUrl?: string, projectName?: string) {
  try {
    addLog(deploymentId, `Starting deployment for ${gitUrl || projectName}`)
    
    // Update status to building
    updateDeploymentStatus(deploymentId, 'building')
    addLog(deploymentId, 'Building container image...')
    
    // Simulate build process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Update status to deploying
    updateDeploymentStatus(deploymentId, 'deploying', { 
      image_tag: `brimble-app-${deploymentId}:latest` 
    })
    addLog(deploymentId, 'Deploying container...')
    
    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Update status to running
    updateDeploymentStatus(deploymentId, 'running', { 
      live_url: `http://app-${deploymentId}.localhost:4000`,
      container_id: `container-${deploymentId}`
    })
    addLog(deploymentId, 'Deployment successfully completed!')
    
  } catch (error) {
    updateDeploymentStatus(deploymentId, 'failed')
    addLog(deploymentId, `Deployment failed: ${error}`)
  }
}

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`)
})
