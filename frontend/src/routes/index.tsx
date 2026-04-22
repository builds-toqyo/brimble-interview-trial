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
import { DeploymentListSkeleton } from '../components/SkeletonLoader'
import { appToast } from '../utils/toast'
import { Github, ExternalLink, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react'

// Custom hooks for better state management
const useDeployForm = () => {
  const [gitUrl, setGitUrl] = useState('')
  const [validationError, setValidationError] = useState('')
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: createDeployment,
    onMutate: () => {
      appToast.deployment.creating()
    },
    onSuccess: (data) => {
      setGitUrl('')
      setValidationError('')
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      appToast.deployment.created(data.id)
    },
    onError: (error: Error) => {
      appToast.deployment.createFailed(error.message)
      setValidationError(error.message)
    },
  })

  const validateGitUrl = (url: string): boolean => {
    if (!url.trim()) {
      return false
    }
    
    const gitUrlRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\.git$/
    return gitUrlRegex.test(url.trim())
  }

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!gitUrl.trim()) {
      setValidationError('Git URL is required')
      return
    }
    
    if (!validateGitUrl(gitUrl)) {
      setValidationError('Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo.git)')
      return
    }
    
    setValidationError('')
    mutation.mutate({ gitUrl: gitUrl.trim() })
  }, [gitUrl, mutation])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setGitUrl(value)
    if (validationError) {
      setValidationError('')
    }
  }, [validationError])

  return {
    gitUrl,
    setGitUrl: handleInputChange,
    handleSubmit,
    isPending: mutation.isPending,
    validationError,
    isValid: validateGitUrl(gitUrl)
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
    onMutate: () => {
      appToast.deployment.rollingBack()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', deploymentId] })
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      appToast.deployment.rollbackSuccess()
    },
    onError: (error: Error) => {
      appToast.deployment.rollbackFailed(error.message)
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
  const { gitUrl, setGitUrl, handleSubmit, isPending, validationError } = useDeployForm()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Github className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">New Deployment</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="relative">
            <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              placeholder="https://github.com/user/repo.git"
              value={gitUrl}
              onChange={setGitUrl}
              className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                validationError 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300 bg-white'
              }`}
              disabled={isPending}
            />
          </div>
          
          {validationError && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{validationError}</span>
            </div>
          )}
          
          <p className="mt-2 text-xs text-gray-500">
            Enter a GitHub repository URL to deploy your application
          </p>
        </div>
        
        <button
          type="submit"
          disabled={isPending || !gitUrl.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Deploy Application
            </>
          )}
        </button>
      </form>
    </div>
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
  const config = useMemo(() => ({
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending' },
    building: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Zap, label: 'Building' },
    deploying: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Zap, label: 'Deploying' },
    running: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Running' },
    failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle, label: 'Failed' },
    stopping: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock, label: 'Stopping' },
    stopped: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock, label: 'Stopped' }
  }), [])

  const statusConfig = config[status]
  const Icon = statusConfig.icon

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusConfig.color}`}>
      <Icon className="w-3 h-3" />
      {statusConfig.label}
    </div>
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {deployment.project_name || 'Unnamed Deployment'}
            </h3>
            {deployment.git_url && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Github className="w-4 h-4" />
                <span className="truncate max-w-xs">
                  {deployment.git_url.replace('https://github.com/', '').replace('.git', '')}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={deployment.status} />
            <VersionBadge currentVersion={deployment.current_version} />
          </div>
        </div>
        
        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Created {new Date(deployment.created_at).toLocaleDateString()}</span>
          </div>
          {deployment.host_port && (
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Port {deployment.host_port}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          {deployment.live_url && (
            <a
              href={deployment.live_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Live
            </a>
          )}
          
          <RollbackButton deploymentId={deployment.id} />
          <AdvancedFeaturesButton deploymentId={deployment.id} />
          <DeploymentLogs id={deployment.id} />
        </div>
      </div>

      <div className={`h-1 ${
        deployment.status === 'running' ? 'bg-green-500' :
        deployment.status === 'failed' ? 'bg-red-500' :
        deployment.status === 'building' || deployment.status === 'deploying' ? 'bg-blue-500' :
        deployment.status === 'pending' ? 'bg-yellow-500' :
        'bg-gray-300'
      }`} />
    </div>
  )
}

const DeploymentList = () => {
  const { data, isLoading, error } = useDeploymentData()

  if (isLoading) return <DeploymentListSkeleton />
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 text-red-800">
        <AlertCircle className="w-5 h-5" />
        <div>
          <h3 className="font-medium">Failed to load deployments</h3>
          <p className="text-sm text-red-600">{(error as Error).message}</p>
        </div>
      </div>
    </div>
  )
  if (!data || !Array.isArray(data) || data.length === 0) return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <Github className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No deployments yet</h3>
      <p className="text-gray-600">Create your first deployment to get started</p>
    </div>
  )

  return (
    <div className="space-y-4">
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
