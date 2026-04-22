import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/')({ component: Home })

interface Deployment {
  id: string
  git_url?: string
  project_name?: string
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed' | 'stopping' | 'stopped'
  image_tag?: string
  live_url?: string
  container_id?: string
  created_at: string
  updated_at: string
  current_version?: number
  host_port?: number
}

interface DeploymentVersion {
  id: number
  deployment_id: string
  version: number
  image_tag: string
  git_commit?: string
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed' | 'stopping' | 'stopped'
  container_id?: string
  host_port?: number
  created_at: string
  updated_at: string
}

interface VersionInfo {
  versions: DeploymentVersion[]
  current?: DeploymentVersion
  previous?: DeploymentVersion
  canRollback: boolean
}

async function fetchDeployments(): Promise<Array<Deployment>> {
  const r = await fetch('/api/deployments')
  if (!r.ok) throw new Error('Failed to fetch deployments')
  return r.json()
}

async function createDeployment(data: {
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

async function fetchVersions(deploymentId: string): Promise<VersionInfo> {
  const r = await fetch(`/api/deployments/${deploymentId}/versions`)
  if (!r.ok) throw new Error('Failed to fetch versions')
  return r.json()
}

async function rollbackDeployment(deploymentId: string): Promise<{ message: string; previousVersion: DeploymentVersion }> {
  const r = await fetch(`/api/deployments/${deploymentId}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!r.ok) throw new Error('Failed to rollback deployment')
  return r.json()
}

function DeployForm() {
  const [gitUrl, setGitUrl] = useState('')
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: createDeployment,
    onSuccess: () => {
      setGitUrl('')
      qc.invalidateQueries({ queryKey: ['deployments'] })
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (gitUrl) mutation.mutate({ gitUrl })
      }}
      className="flex gap-2"
    >
      <input
        type="url"
        value={gitUrl}
        onChange={(e) => setGitUrl(e.target.value)}
        placeholder="https://github.com/user/repo.git"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={mutation.isPending || !gitUrl}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? 'Creating...' : 'Deploy'}
      </button>
    </form>
  )
}

function DeploymentLogs({ id }: { id: string }) {
  const [logs, setLogs] = useState<Array<string>>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const es = new EventSource(`/api/deployments/${id}/logs`)
    es.onmessage = (e) => setLogs((prev) => [...prev.slice(-100), e.data])
    es.onerror = () => es.close()
    return () => es.close()
  }, [id, open])

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-blue-600 hover:text-blue-800"
      >
        {open ? 'Hide' : 'Show'} Logs
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-gray-900 text-green-400 text-xs rounded max-h-48 overflow-auto whitespace-pre-wrap">
          {logs.length ? logs.join('\n') : 'Waiting for logs...'}
        </pre>
      )}
    </div>
  )
}

const statusClasses: Record<string, string> = {
  running: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  building: 'bg-yellow-100 text-yellow-800',
  deploying: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-800',
  stopping: 'bg-orange-100 text-orange-800',
  stopped: 'bg-gray-100 text-gray-600',
}

function VersionHistoryModal({ deploymentId, isOpen, onClose }: { deploymentId: string; isOpen: boolean; onClose: () => void }) {
  const { data: versionInfo, isLoading } = useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    enabled: isOpen,
  })
  const qc = useQueryClient()
  
  const rollbackMutation = useMutation({
    mutationFn: () => rollbackDeployment(deploymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deployments'] })
      qc.invalidateQueries({ queryKey: ['versions', deploymentId] })
      onClose()
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Version History</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>
        
        {isLoading ? (
          <div>Loading versions...</div>
        ) : versionInfo ? (
          <div className="space-y-3">
            {versionInfo.versions.map((version) => (
              <div
                key={version.version}
                className={`border rounded-lg p-3 ${
                  versionInfo.current?.version === version.version
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      Version {version.version}
                      {versionInfo.current?.version === version.version && (
                        <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                      {versionInfo.previous?.version === version.version && (
                        <span className="ml-2 text-xs bg-gray-500 text-white px-2 py-1 rounded">
                          Previous
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Status: <span className={`font-medium ${statusClasses[version.status]}`}>
                        {version.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(version.created_at).toLocaleString()}
                    </div>
                    {version.git_commit && (
                      <div className="text-xs text-gray-500 font-mono">
                        Commit: {version.git_commit.slice(0, 8)}
                      </div>
                    )}
                  </div>
                  {versionInfo.previous?.version === version.version && version.status === 'stopped' && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to rollback to this version?')) {
                          rollbackMutation.mutate()
                        }
                      }}
                      disabled={rollbackMutation.isPending}
                      className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:bg-gray-400"
                    >
                      {rollbackMutation.isPending ? 'Rolling back...' : 'Rollback'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {!versionInfo.canRollback && (
              <div className="text-sm text-gray-500 text-center py-4">
                No previous versions available for rollback
              </div>
            )}
          </div>
        ) : (
          <div>Failed to load versions</div>
        )}
      </div>
    </div>
  )
}

function RollbackButton({ deploymentId }: { deploymentId: string }) {
  const [showModal, setShowModal] = useState(false)
  const { data: versionInfo } = useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    refetchInterval: 10000,
  })

  if (!versionInfo?.canRollback) return null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-xs text-orange-600 hover:text-orange-800 font-medium"
      >
        View Versions & Rollback
      </button>
      <VersionHistoryModal
        deploymentId={deploymentId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}

function DeploymentList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['deployments'],
    queryFn: fetchDeployments,
    refetchInterval: 3000,
  })

  if (isLoading) return <div>Loading...</div>
  if (error)
    return <div className="text-red-600">{(error as Error).message}</div>
  if (!data?.length)
    return <div className="text-gray-500">No deployments yet</div>

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div
          key={d.id}
          className="border border-gray-200 rounded-md p-3 bg-white"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold flex items-center gap-2">
                {d.git_url?.split('/').pop()?.replace('.git', '') ||
                  d.project_name}
                {d.current_version && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    v{d.current_version}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">{d.git_url}</div>
              {d.image_tag && (
                <div className="text-xs text-gray-400">{d.image_tag}</div>
              )}
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${statusClasses[d.status] ?? 'bg-gray-100'}`}
            >
              {d.status}
            </span>
          </div>
          {d.live_url && (
            <a
              href={d.live_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block mr-4"
            >
              View Live →
            </a>
          )}
          <RollbackButton deploymentId={d.id} />
          <DeploymentLogs id={d.id} />
        </div>
      ))}
    </div>
  )
}

function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold">Brimble Enterprise</h1>
          <div className="text-sm text-gray-500">
            Advanced deployment pipeline with rollback, build cache, and zero-downtime deployments
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8 grid gap-8">
        <section>
          <h2 className="text-base font-medium mb-3">Create New Deployment</h2>
          <DeployForm />
        </section>
        <section>
          <h2 className="text-base font-medium mb-3">Deployments</h2>
          <DeploymentList />
        </section>
      </main>
    </div>
  )
}
