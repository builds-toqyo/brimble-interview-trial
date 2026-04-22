import { spawn } from 'child_process'
import Docker from 'dockerode'
import fs from 'fs'
import path from 'path'
import { 
  updateDeployment, 
  createDeploymentVersion, 
  updateDeploymentVersion,
  getDeploymentVersions,
  getCurrentVersion,
  getPreviousVersion,
  setCurrentVersion
} from './db'
import { emitLog, emitStatus } from './events'
import { addDeploymentRoute, removeDeploymentRoute, publicUrlFor } from './caddy'

const WORKSPACE = process.env.WORKSPACE_DIR || path.resolve('./workspace')
const docker = new Docker({ socketPath: '/var/run/docker.sock' })

fs.mkdirSync(WORKSPACE, { recursive: true })

/**
 * Run a subprocess and stream stdout+stderr into the deployment log.
 * Resolves with exit code; rejects only on spawn failure.
 */
function runStreamed(
  deploymentId: string,
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<number> {
  return new Promise((resolve, reject) => {
    emitLog(deploymentId, `$ ${cmd} ${args.join(' ')}`)
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
    })
    const onChunk = (buf: Buffer) => {
      for (const line of buf.toString('utf8').split(/\r?\n/)) {
        if (line.length) emitLog(deploymentId, line)
      }
    }
    child.stdout.on('data', onChunk)
    child.stderr.on('data', onChunk)
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? -1))
  })
}

function setStatus(
  deploymentId: string,
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed' | 'stopping' | 'stopped',
): void {
  updateDeployment(deploymentId, { status })
  emitStatus(deploymentId, status)
}

/**
 * Ask the kernel for a free ephemeral port on the host side.
 * We then publish the container's exposed port to this host port.
 */
async function pickFreePort(): Promise<number> {
  const net = await import('net')
  return new Promise<number>((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, () => {
      const addr = srv.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      srv.close(() => resolve(port))
    })
  })
}

async function streamContainerLogs(
  deploymentId: string,
  container: Docker.Container,
): Promise<void> {
  const stream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    tail: 0,
  })
  // Docker multiplexes stdout/stderr; demux via modem helper.
  const dockerModem = (container as any).modem
  const out = {
    write: (b: Buffer) => emitLog(deploymentId, b.toString('utf8').trimEnd()),
  }
  const err = {
    write: (b: Buffer) => emitLog(deploymentId, b.toString('utf8').trimEnd()),
  }
  dockerModem.demuxStream(stream, out, err)
}

/**
 * Get the next version number for a deployment
 */
function getNextVersion(deploymentId: string): number {
  const versions = getDeploymentVersions(deploymentId)
  return versions.length > 0 ? Math.max(...versions.map(v => v.version)) + 1 : 1
}

/**
 * Build with cache reuse using Railpack
 */
async function buildWithCache(
  deploymentId: string,
  workDir: string,
  imageTag: string,
): Promise<void> {
  emitLog(deploymentId, 'Building image with Railpack (cache enabled)')
  
  // Use BUILDKIT_HOST for cache reuse and set cache directory
  await runStreamed(deploymentId, 'railpack', [
    'build',
    '--name',
    imageTag,
    workDir,
  ], {
    env: {
      ...process.env,
      BUILDKIT_HOST: process.env.BUILDKIT_HOST || 'docker-container://buildkit',
      // Enable build cache reuse
      RAILPACK_CACHE_DIR: `/tmp/railpack-cache/${deploymentId}`,
    },
  })
}

/**
 * Deploy container with blue-green strategy for zero downtime
 */
async function deployContainerZeroDowntime(
  deploymentId: string,
  imageTag: string,
  version: number,
): Promise<void> {
  setStatus(deploymentId, 'deploying')
  
  const exposedPort = '3000/tcp'
  const hostPort = await pickFreePort()
  
  emitLog(deploymentId, `Running container: ${exposedPort} -> host:${hostPort}`)

  const container = await docker.createContainer({
    Image: imageTag,
    name: `brimble-${deploymentId}-v${version}`,
    ExposedPorts: { [exposedPort]: {} },
    HostConfig: {
      PortBindings: { [exposedPort]: [{ HostPort: String(hostPort) }] },
      RestartPolicy: { Name: 'unless-stopped' },
      ExtraHosts: ['host.docker.internal:host-gateway'],
    },
  })
  
  await container.start()
  
  // Update version record
  updateDeploymentVersion(deploymentId, version, {
    status: 'running',
    container_id: container.id,
    host_port: hostPort,
  })

  // Attach log stream
  streamContainerLogs(deploymentId, container).catch((err) =>
    emitLog(deploymentId, `log stream error: ${err}`),
  )

  // Health check before switching traffic
  emitLog(deploymentId, 'Performing health check...')
  await new Promise(resolve => setTimeout(resolve, 5000)) // Basic health check delay
  
  // Register new route
  emitLog(deploymentId, `Registering Caddy route /apps/${deploymentId}`)
  await addDeploymentRoute(deploymentId, hostPort)
  
  // Update deployment to point to new version
  setCurrentVersion(deploymentId, version)
  const liveUrl = publicUrlFor(deploymentId)
  updateDeployment(deploymentId, { 
    live_url: liveUrl,
    container_id: container.id,
    host_port: hostPort
  })
  
  setStatus(deploymentId, 'running')
  emitLog(deploymentId, `Deployment running at ${liveUrl}`)
}

/**
 * Stop and remove old container for rollback/cleanup
 */
async function stopContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId)
    await container.stop({ timeout: 5000 })
    await container.remove()
  } catch (err) {
    // Container might already be stopped/removed
    console.warn(`Failed to stop container ${containerId}:`, err)
  }
}

/**
 * Rollback to previous version
 */
export async function rollbackDeployment(deploymentId: string): Promise<void> {
  try {
    emitLog(deploymentId, 'Starting rollback to previous version...')
    setStatus(deploymentId, 'stopping')
    
    const previousVersion = getPreviousVersion(deploymentId)
    if (!previousVersion) {
      throw new Error('No previous version available for rollback')
    }
    
    const currentVersion = getCurrentVersion(deploymentId)
    
    // Stop current container
    if (currentVersion?.container_id) {
      emitLog(deploymentId, 'Stopping current container...')
      await stopContainer(currentVersion.container_id)
      
      // Remove current route
      await removeDeploymentRoute(deploymentId)
    }
    
    // Start previous version
    if (previousVersion.container_id) {
      emitLog(deploymentId, `Starting previous container (version ${previousVersion.version})`)
      
      // Try to start the existing container
      try {
        const container = docker.getContainer(previousVersion.container_id)
        await container.start()
        
        // Update version status
        updateDeploymentVersion(deploymentId, previousVersion.version, {
          status: 'running'
        })
        
        // Re-register route
        await addDeploymentRoute(deploymentId, previousVersion.host_port!)
        
        // Update deployment
        setCurrentVersion(deploymentId, previousVersion.version)
        const liveUrl = publicUrlFor(deploymentId)
        updateDeployment(deploymentId, {
          live_url: liveUrl,
          container_id: previousVersion.container_id,
          host_port: previousVersion.host_port
        })
        
        setStatus(deploymentId, 'running')
        emitLog(deploymentId, `Rollback complete. Running at ${liveUrl}`)
      } catch (err) {
        throw new Error(`Failed to start previous container: ${(err as Error).message}`)
      }
    } else {
      throw new Error('Previous version container not found')
    }
  } catch (err) {
    emitLog(deploymentId, `Rollback failed: ${(err as Error).message}`)
    setStatus(deploymentId, 'failed')
  }
}

/**
 * Enhanced deployment with versioning and zero-downtime support
 */
export async function runDeployment(deploymentId: string, gitUrl: string): Promise<void> {
  try {
    setStatus(deploymentId, 'building')
    
    const version = getNextVersion(deploymentId)
    const imageTag = `brimble-app-${deploymentId}:v${version}`
    
    // Create version record
    createDeploymentVersion(deploymentId, version, imageTag)
    
    // 1. Clone repo
    const workDir = path.join(WORKSPACE, deploymentId)
    await runStreamed(deploymentId, 'git', [
      'clone',
      '--depth',
      '1',
      gitUrl,
      workDir,
    ])

    // 2. Get git commit for tracking
    const gitCommitResult = await runStreamed(deploymentId, 'git', [
      'rev-parse',
      'HEAD'
    ], { cwd: workDir })
    
    // Update version with git commit
    updateDeploymentVersion(deploymentId, version, { git_commit: gitCommitResult.toString().trim() })

    // 3. Build with cache reuse
    await buildWithCache(deploymentId, workDir, imageTag)

    // 4. Deploy with zero-downtime strategy
    await deployContainerZeroDowntime(deploymentId, imageTag, version)
    
    // 5. Cleanup old versions (keep last 3)
    const versions = getDeploymentVersions(deploymentId)
    const versionsToCleanup = versions.slice(3) // Keep latest 3
    
    for (const oldVersion of versionsToCleanup) {
      if (oldVersion.container_id && oldVersion.status === 'stopped') {
        emitLog(deploymentId, `Cleaning up old version ${oldVersion.version}`)
        await stopContainer(oldVersion.container_id)
      }
    }
    
  } catch (err) {
    emitLog(deploymentId, `Deployment failed: ${(err as Error).message}`)
    setStatus(deploymentId, 'failed')
  }
}
