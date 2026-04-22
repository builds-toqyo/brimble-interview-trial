import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  fetchDeployments, 
  createDeployment, 
  fetchVersions, 
  rollbackDeployment
} from '../api/deployments'
import { AdvancedFeaturesButton } from '../components/AdvancedFeaturesButton'
import { VersionHistoryModal } from '../components/VersionHistoryModal'
import { DeploymentLogs } from '../components/DeploymentLogs'

// Custom hooks for better state management
const useDeployForm = () => {
  const [gitUrl, setGitUrl] = useState('')
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: createDeployment,
    onSuccess: () => {
      setGitUrl('')
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
    },
  })

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (gitUrl.trim()) {
      mutation.mutate({ gitUrl: gitUrl.trim() })
    }
  }, [gitUrl, mutation])

  return {
    gitUrl,
    setGitUrl,
    handleSubmit,
    isPending: mutation.isPending
  }
}

const useDeploymentData = () => {
  return useQuery({
    queryKey: ['deployments'],
    queryFn: fetchDeployments,
    refetchInterval: 3000,
  })
}

const useVersionInfo = (deploymentId: string) => {
  return useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    refetchInterval: 10000,
  })
}

const useRollback = (deploymentId: string) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => rollbackDeployment(deploymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', deploymentId] })
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
    }
  })
}

// Types
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

type DeploymentStatus = 'pending' | 'building' | 'deploying' | 'running' | 'failed' | 'stopping' | 'stopped'


// Components
const DeployForm = () => {
  const { gitUrl, setGitUrl, handleSubmit, isPending } = useDeployForm()

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="url"
        placeholder="https://github.com/user/repo.git"
        value={gitUrl}
        onChange={(e) => setGitUrl(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={isPending || !gitUrl.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isPending ? 'Deploying...' : 'Deploy'}
      </button>
    </form>
  )
}

const VersionBadge = ({ currentVersion }: { currentVersion: number | null }) => {
  if (!currentVersion) return null
  
  return (
    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
      v{currentVersion}
    </span>
  )
}

const StatusBadge = ({ status }: { status: DeploymentStatus }) => {
  const colors = useMemo(() => ({
    pending: 'bg-yellow-100 text-yellow-800',
    building: 'bg-blue-100 text-blue-800',
    deploying: 'bg-purple-100 text-purple-800',
    running: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    stopping: 'bg-orange-100 text-orange-800',
    stopped: 'bg-gray-100 text-gray-800'
  }), [])

  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${colors[status]}`}>
      {status}
    </span>
  )
}

const RollbackButton = ({ deploymentId }: { deploymentId: string }) => {
  const [showModal, setShowModal] = useState(false)
  const { data: versionInfo } = useVersionInfo(deploymentId)
  const rollback = useRollback(deploymentId)

  if (!versionInfo?.canRollback) return null

  const handleRollback = useCallback(() => {
    rollback.mutate()
    setShowModal(false)
  }, [rollback])

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
        onRollback={handleRollback}
        isRollingBack={rollback.isPending}
      />
    </>
  )
}

const DeploymentCard = ({ deployment }: { deployment: Deployment }) => {
  const { data: versionInfo } = useVersionInfo(deployment.id)

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">
          {deployment.project_name || 'Unnamed Deployment'}
        </h3>
        <div className="flex gap-2 items-center">
          <StatusBadge status={deployment.status} />
          <VersionBadge currentVersion={deployment.current_version} />
        </div>
      </div>
      
      {deployment.git_url && (
        <p className="text-sm text-gray-600 mb-2 truncate">
          {deployment.git_url}
        </p>
      )}
      
      <div className="text-xs text-gray-500 mb-3">
        Created: {new Date(deployment.created_at).toLocaleString()}
      </div>
      
      {deployment.live_url && (
        <a
          href={deployment.live_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block mr-4"
        >
          View Live
        </a>
      )}
      
      <RollbackButton deploymentId={deployment.id} />
      <AdvancedFeaturesButton deploymentId={deployment.id} />
      <DeploymentLogs id={deployment.id} />
    </div>
  )
}

const DeploymentList = () => {
  const { data, isLoading, error } = useDeploymentData()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div className="text-red-600">{(error as Error).message}</div>
  if (!data || !Array.isArray(data) || data.length === 0) return <div>No deployments found</div>

  return (
    <div className="grid gap-4">
      {data.map((deployment) => (
        <DeploymentCard key={deployment.id} deployment={deployment} />
      ))}
    </div>
  )
}

const Home = () => {
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

export const Route = createFileRoute('/')({ component: Home })
