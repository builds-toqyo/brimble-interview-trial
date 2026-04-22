import { spawn } from 'child_process'
import Docker from 'dockerode'
import fs from 'fs'
import path from 'path'
import { updateDeployment } from './db'
import { emitLog, emitStatus } from './events'
import { addDeploymentRoute, publicUrlFor } from './caddy'

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
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed',
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

export async function runDeployment(
  deploymentId: string,
  gitUrl: string,
): Promise<void> {
  const repoDir = path.join(WORKSPACE, deploymentId)
  const imageTag = `brimble-app-${deploymentId}:latest`

  try {
    // 1. Clone
    setStatus(deploymentId, 'building')
    fs.rmSync(repoDir, { recursive: true, force: true })
    fs.mkdirSync(repoDir, { recursive: true })
    emitLog(deploymentId, `Cloning ${gitUrl}`)
    const cloneCode = await runStreamed(deploymentId, 'git', [
      'clone',
      '--depth',
      '1',
      gitUrl,
      repoDir,
    ])
    if (cloneCode !== 0) throw new Error(`git clone exited ${cloneCode}`)

    // 2. Build with Railpack. Railpack shells out to docker buildx using
    //    its BuildKit frontend — no handwritten Dockerfile involved.
    emitLog(deploymentId, `Building image with Railpack → ${imageTag}`)
    
    const buildCode = await runStreamed(
      deploymentId,
      'railpack',
      ['build', '--name', imageTag, repoDir],
      { 
        env: { 
          DOCKER_BUILDKIT: '1',
          MISE_BIN: '/usr/local/bin/mise',
          PATH: `/usr/local/bin:${process.env.PATH}` 
        } 
      },
    )
    if (buildCode !== 0) throw new Error(`railpack build exited ${buildCode}`)
    updateDeployment(deploymentId, { image_tag: imageTag })

    // 3. Inspect image to find an exposed port (default 3000 if none).
    const image = docker.getImage(imageTag)
    const info = await image.inspect()
    const exposedPort =
      Object.keys(info.Config?.ExposedPorts || {})[0] || '3000/tcp'
    const containerPort = exposedPort.split('/')[0]

    // 4. Run the container, publishing to a free host port.
    setStatus(deploymentId, 'deploying')
    const hostPort = await pickFreePort()
    emitLog(
      deploymentId,
      `Running container: ${containerPort} → host:${hostPort}`,
    )

    const container = await docker.createContainer({
      Image: imageTag,
      name: `brimble-${deploymentId}`,
      ExposedPorts: { [exposedPort]: {} },
      HostConfig: {
        PortBindings: { [exposedPort]: [{ HostPort: String(hostPort) }] },
        RestartPolicy: { Name: 'unless-stopped' },
        // So the deployed container can be reached from Caddy via
        // host.docker.internal:<hostPort>
        ExtraHosts: ['host.docker.internal:host-gateway'],
      },
    })
    await container.start()
    updateDeployment(deploymentId, {
      container_id: container.id,
      host_port: hostPort,
    })

    // 5. Attach log stream (don't await — runs until container stops).
    streamContainerLogs(deploymentId, container).catch((err) =>
      emitLog(deploymentId, `log stream error: ${err}`),
    )

    // 6. Register route in Caddy.
    emitLog(deploymentId, `Registering Caddy route /apps/${deploymentId}`)
    await addDeploymentRoute(deploymentId, hostPort)
    const liveUrl = publicUrlFor(deploymentId)
    updateDeployment(deploymentId, { live_url: liveUrl })
    setStatus(deploymentId, 'running')
    emitLog(deploymentId, `✅ Deployment running at ${liveUrl}`)
  } catch (err) {
    emitLog(deploymentId, `❌ ${(err as Error).message}`)
    setStatus(deploymentId, 'failed')
  }
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
