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

// Advanced features API functions
async function scheduleRollback(deploymentId: string, targetVersion: number, scheduledAt: string, reason?: string): Promise<{ message: string; id: number }> {
  const r = await fetch(`/api/deployments/${deploymentId}/schedule-rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetVersion, scheduledAt, reason }),
  })
  if (!r.ok) throw new Error('Failed to schedule rollback')
  return r.json()
}

async function getScheduledRollbacks(deploymentId: string): Promise<ScheduledRollback[]> {
  const r = await fetch(`/api/deployments/${deploymentId}/scheduled-rollbacks`)
  if (!r.ok) throw new Error('Failed to fetch scheduled rollbacks')
  return r.json()
}

async function createTrafficSplit(deploymentId: string, versionA: number, versionB: number, weightA: number): Promise<{ message: string; id: number }> {
  const r = await fetch(`/api/deployments/${deploymentId}/traffic-split`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionA, versionB, weightA }),
  })
  if (!r.ok) throw new Error('Failed to create traffic split')
  return r.json()
}

async function activateTrafficSplit(splitId: number, deploymentId: string): Promise<{ message: string }> {
  const r = await fetch(`/api/traffic-splits/${splitId}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deploymentId }),
  })
  if (!r.ok) throw new Error('Failed to activate traffic split')
  return r.json()
}

async function updateTrafficSplitWeights(splitId: number, weightA: number, weightB: number): Promise<{ message: string }> {
  const r = await fetch(`/api/traffic-splits/${splitId}/weights`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weightA, weightB }),
  })
  if (!r.ok) throw new Error('Failed to update traffic split weights')
  return r.json()
}

async function getRegions(): Promise<Region[]> {
  const r = await fetch('/api/regions')
  if (!r.ok) throw new Error('Failed to fetch regions')
  return r.json()
}

async function createRegion(name: string, endpoint: string, regionCode: string): Promise<{ message: string; id: number }> {
  const r = await fetch('/api/regions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, endpoint, regionCode }),
  })
  if (!r.ok) throw new Error('Failed to create region')
  return r.json()
}

async function deployToRegion(deploymentId: string, regionId: number, version: number): Promise<{ message: string; id: number }> {
  const r = await fetch(`/api/deployments/${deploymentId}/deploy-to-region`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ regionId, version }),
  })
  if (!r.ok) throw new Error('Failed to deploy to region')
  return r.json()
}

async function getDeploymentRegions(deploymentId: string): Promise<DeploymentRegion[]> {
  const r = await fetch(`/api/deployments/${deploymentId}/regions`)
  if (!r.ok) throw new Error('Failed to fetch deployment regions')
  return r.json()
}

async function createHealthCheck(deploymentId: string, version: number, config: {
  endpointPath?: string
  method?: 'GET' | 'POST'
  expectedStatus?: number
  timeoutMs?: number
  intervalMs?: number
}): Promise<{ message: string; id: number }> {
  const r = await fetch(`/api/deployments/${deploymentId}/health-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, ...config }),
  })
  if (!r.ok) throw new Error('Failed to create health check')
  return r.json()
}

async function getHealthChecks(deploymentId: string): Promise<HealthCheck[]> {
  const r = await fetch(`/api/deployments/${deploymentId}/health-checks`)
  if (!r.ok) throw new Error('Failed to fetch health checks')
  return r.json()
}

async function optimizeDatabase(): Promise<{ message: string }> {
  const r = await fetch('/api/optimize/database', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!r.ok) throw new Error('Failed to optimize database')
  return r.json()
}

async function analyzePerformance(): Promise<{ message: string }> {
  const r = await fetch('/api/analyze-performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!r.ok) throw new Error('Failed to analyze performance')
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

// Advanced Features Components
function ScheduledRollbackModal({ deploymentId, isOpen, onClose }: { deploymentId: string; isOpen: boolean; onClose: () => void }) {
  const [targetVersion, setTargetVersion] = useState(1)
  const [scheduledAt, setScheduledAt] = useState('')
  const [reason, setReason] = useState('')
  const { data: versionInfo } = useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    enabled: isOpen,
  })
  const { data: scheduledRollbacks, refetch } = useQuery({
    queryKey: ['scheduled-rollbacks', deploymentId],
    queryFn: () => getScheduledRollbacks(deploymentId),
    enabled: isOpen,
  })
  const qc = useQueryClient()
  
  const scheduleMutation = useMutation({
    mutationFn: (data: { targetVersion: number; scheduledAt: string; reason?: string }) =>
      scheduleRollback(deploymentId, data.targetVersion, data.scheduledAt, data.reason),
    onSuccess: () => {
      setTargetVersion(1)
      setScheduledAt('')
      setReason('')
      qc.invalidateQueries({ queryKey: ['scheduled-rollbacks', deploymentId] })
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Schedule Rollback</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Target Version</label>
            <select
              value={targetVersion}
              onChange={(e) => setTargetVersion(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {versionInfo?.versions.map((v) => (
                <option key={v.version} value={v.version}>
                  Version {v.version} ({v.status})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Scheduled Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you scheduling this rollback?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => scheduleMutation.mutate({ targetVersion, scheduledAt, reason })}
              disabled={scheduleMutation.isPending || !scheduledAt}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {scheduleMutation.isPending ? 'Scheduling...' : 'Schedule Rollback'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
        
        {scheduledRollbacks && scheduledRollbacks.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-2">Scheduled Rollbacks</h4>
            <div className="space-y-2">
              {scheduledRollbacks.map((rollback) => (
                <div key={rollback.id} className="border rounded p-2 text-sm">
                  <div className="flex justify-between">
                    <span>Version {rollback.target_version}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      rollback.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      rollback.status === 'executed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rollback.status}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    {new Date(rollback.scheduled_at).toLocaleString()}
                  </div>
                  {rollback.reason && (
                    <div className="text-gray-500">{rollback.reason}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TrafficSplitModal({ deploymentId, isOpen, onClose }: { deploymentId: string; isOpen: boolean; onClose: () => void }) {
  const [versionA, setVersionA] = useState(1)
  const [versionB, setVersionB] = useState(1)
  const [weightA, setWeightA] = useState(50)
  const { data: versionInfo } = useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    enabled: isOpen,
  })
  const qc = useQueryClient()
  
  const createMutation = useMutation({
    mutationFn: () => createTrafficSplit(deploymentId, versionA, versionB, weightA),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['traffic-splits', deploymentId] })
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">A/B Testing - Traffic Split</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Version A</label>
              <select
                value={versionA}
                onChange={(e) => setVersionA(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {versionInfo?.versions.map((v) => (
                  <option key={v.version} value={v.version}>v{v.version}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Version B</label>
              <select
                value={versionB}
                onChange={(e) => setVersionB(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {versionInfo?.versions.map((v) => (
                  <option key={v.version} value={v.version}>v{v.version}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Traffic Split: {weightA}% / {100 - weightA}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={weightA}
              onChange={(e) => setWeightA(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Split'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MultiRegionModal({ deploymentId, isOpen, onClose }: { deploymentId: string; isOpen: boolean; onClose: () => void }) {
  const [showCreateRegion, setShowCreateRegion] = useState(false)
  const [newRegion, setNewRegion] = useState({ name: '', endpoint: '', regionCode: '' })
  const { data: regions, refetch } = useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
    enabled: isOpen,
  })
  const { data: deploymentRegions, refetch: refetchDeploymentRegions } = useQuery({
    queryKey: ['deployment-regions', deploymentId],
    queryFn: () => getDeploymentRegions(deploymentId),
    enabled: isOpen,
  })
  const { data: versionInfo } = useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    enabled: isOpen,
  })
  const qc = useQueryClient()
  
  const createRegionMutation = useMutation({
    mutationFn: () => createRegion(newRegion.name, newRegion.endpoint, newRegion.regionCode),
    onSuccess: () => {
      setNewRegion({ name: '', endpoint: '', regionCode: '' })
      setShowCreateRegion(false)
      qc.invalidateQueries({ queryKey: ['regions'] })
    },
  })
  
  const deployMutation = useMutation({
    mutationFn: (data: { regionId: number; version: number }) =>
      deployToRegion(deploymentId, data.regionId, data.version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deployment-regions', deploymentId] })
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Multi-Region Deployment</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <div className="space-y-6">
          {/* Create New Region */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Regions</h4>
              <button
                onClick={() => setShowCreateRegion(!showCreateRegion)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Region
              </button>
            </div>
            
            {showCreateRegion && (
              <div className="border rounded p-3 mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="Region Name"
                  value={newRegion.name}
                  onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Endpoint URL"
                  value={newRegion.endpoint}
                  onChange={(e) => setNewRegion({ ...newRegion, endpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Region Code (e.g., us-east-1)"
                  value={newRegion.regionCode}
                  onChange={(e) => setNewRegion({ ...newRegion, regionCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => createRegionMutation.mutate()}
                    disabled={createRegionMutation.isPending}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateRegion(false)}
                    className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-2">
              {regions?.map((region) => (
                <div key={region.id} className="border rounded p-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{region.name}</div>
                    <div className="text-sm text-gray-600">{region.region_code}</div>
                    <div className="text-xs text-gray-500">{region.endpoint}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          deployMutation.mutate({ 
                            regionId: region.id, 
                            version: Number(e.target.value) 
                          })
                        }
                      }}
                    >
                      <option value="">Deploy...</option>
                      {versionInfo?.versions.map((v) => (
                        <option key={v.version} value={v.version}>v{v.version}</option>
                      ))}
                    </select>
                    <span className={`px-2 py-1 rounded text-xs ${
                      region.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {region.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Deployment Regions */}
          {deploymentRegions && deploymentRegions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Current Deployments</h4>
              <div className="space-y-2">
                {deploymentRegions.map((dr) => (
                  <div key={dr.id} className="border rounded p-2 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{dr.name}</div>
                      <div className="text-sm text-gray-600">Version {dr.version}</div>
                      <div className="text-xs text-gray-500">{dr.endpoint_url}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      dr.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {dr.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HealthCheckModal({ deploymentId, isOpen, onClose }: { deploymentId: string; isOpen: boolean; onClose: () => void }) {
  const [config, setConfig] = useState({
    endpointPath: '/health',
    method: 'GET' as 'GET' | 'POST',
    expectedStatus: 200,
    timeoutMs: 5000,
    intervalMs: 30000,
  })
  const [version, setVersion] = useState(1)
  const { data: versionInfo } = useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    enabled: isOpen,
  })
  const { data: healthChecks, refetch } = useQuery({
    queryKey: ['health-checks', deploymentId],
    queryFn: () => getHealthChecks(deploymentId),
    enabled: isOpen,
  })
  const qc = useQueryClient()
  
  const createMutation = useMutation({
    mutationFn: () => createHealthCheck(deploymentId, version, config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-checks', deploymentId] })
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Advanced Health Checks</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <div className="space-y-6">
          {/* Create Health Check */}
          <div>
            <h4 className="font-medium mb-2">Create Health Check</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Version</label>
                <select
                  value={version}
                  onChange={(e) => setVersion(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {versionInfo?.versions.map((v) => (
                    <option key={v.version} value={v.version}>v{v.version}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <select
                  value={config.method}
                  onChange={(e) => setConfig({ ...config, method: e.target.value as 'GET' | 'POST' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Endpoint Path</label>
                <input
                  type="text"
                  value={config.endpointPath}
                  onChange={(e) => setConfig({ ...config, endpointPath: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Expected Status</label>
                <input
                  type="number"
                  value={config.expectedStatus}
                  onChange={(e) => setConfig({ ...config, expectedStatus: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={config.timeoutMs}
                  onChange={(e) => setConfig({ ...config, timeoutMs: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Interval (ms)</label>
                <input
                  type="number"
                  value={config.intervalMs}
                  onChange={(e) => setConfig({ ...config, intervalMs: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Health Check'}
            </button>
          </div>
          
          {/* Existing Health Checks */}
          {healthChecks && healthChecks.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Active Health Checks</h4>
              <div className="space-y-2">
                {healthChecks.map((check) => (
                  <div key={check.id} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">v{check.version} - {check.method} {check.endpoint_path}</div>
                        <div className="text-sm text-gray-600">
                          Status: {check.expected_status} | Timeout: {check.timeoutMs}ms | Interval: {check.intervalMs}ms
                        </div>
                        {check.last_check && (
                          <div className="text-xs text-gray-500">
                            Last check: {new Date(check.last_check).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        check.status === 'healthy' ? 'bg-green-100 text-green-800' :
                        check.status === 'unhealthy' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {check.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PerformanceOptimizationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  
  const optimizeMutation = useMutation({
    mutationFn: optimizeDatabase,
    onSuccess: () => {
      // Show success message or refresh data
    },
  })
  
  const analyzeMutation = useMutation({
    mutationFn: analyzePerformance,
    onSuccess: () => {
      // Show analysis results
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Performance Optimization</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Database Optimization</h4>
            <p className="text-sm text-gray-600 mb-3">
              Optimize database queries and add missing indexes for better performance.
            </p>
            <button
              onClick={() => optimizeMutation.mutate()}
              disabled={optimizeMutation.isPending}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {optimizeMutation.isPending ? 'Optimizing...' : 'Optimize Database'}
            </button>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Performance Analysis</h4>
            <p className="text-sm text-gray-600 mb-3">
              Analyze query performance, index usage, and connection pool statistics.
            </p>
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze Performance'}
            </button>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Optimizations include:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Query execution time analysis</li>
              <li>Index usage optimization</li>
              <li>Connection pool tuning</li>
              <li>Slow query identification</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdvancedFeaturesButton({ deploymentId }: { deploymentId: string }) {
  const [showModal, setShowModal] = useState('')
  
  return (
    <>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setShowModal('scheduled-rollback')}
          className="text-xs text-purple-600 hover:text-purple-800 font-medium"
        >
          Schedule Rollback
        </button>
        <button
          onClick={() => setShowModal('traffic-split')}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          A/B Testing
        </button>
        <button
          onClick={() => setShowModal('multi-region')}
          className="text-xs text-green-600 hover:text-green-800 font-medium"
        >
          Multi-Region
        </button>
        <button
          onClick={() => setShowModal('health-check')}
          className="text-xs text-orange-600 hover:text-orange-800 font-medium"
        >
          Health Checks
        </button>
        <button
          onClick={() => setShowModal('performance')}
          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
        >
          Performance
        </button>
      </div>
      
      <ScheduledRollbackModal
        deploymentId={deploymentId}
        isOpen={showModal === 'scheduled-rollback'}
        onClose={() => setShowModal('')}
      />
      
      <TrafficSplitModal
        deploymentId={deploymentId}
        isOpen={showModal === 'traffic-split'}
        onClose={() => setShowModal('')}
      />
      
      <MultiRegionModal
        deploymentId={deploymentId}
        isOpen={showModal === 'multi-region'}
        onClose={() => setShowModal('')}
      />
      
      <HealthCheckModal
        deploymentId={deploymentId}
        isOpen={showModal === 'health-check'}
        onClose={() => setShowModal('')}
      />
      
      <PerformanceOptimizationModal
        isOpen={showModal === 'performance'}
        onClose={() => setShowModal('')}
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
          <AdvancedFeaturesButton deploymentId={d.id} />
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
