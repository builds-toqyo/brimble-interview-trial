import { useQuery } from '@tanstack/react-query'
import { fetchVersions } from '../api/deployments'

interface VersionHistoryModalProps {
  deploymentId: string
  isOpen: boolean
  onClose: () => void
  onRollback: () => void
  isRollingBack: boolean
}

const useVersionInfo = (deploymentId: string) => {
  return useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    enabled: !!deploymentId
  })
}

export const VersionHistoryModal = ({ 
  deploymentId, 
  isOpen, 
  onClose, 
  onRollback, 
  isRollingBack 
}: VersionHistoryModalProps) => {
  const { data: versionInfo, isLoading } = useVersionInfo(deploymentId)

  if (!isOpen || isLoading) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Version History</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <div className="space-y-3">
          {versionInfo?.versions.map((version) => (
            <div 
              key={version.version} 
              className={`border rounded p-3 ${
                versionInfo.current?.version === version.version 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    Version {version.version}
                    {versionInfo.current?.version === version.version && (
                      <span className="ml-2 text-sm text-blue-600">(Current)</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: {version.status}
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(version.created_at).toLocaleString()}
                  </div>
                  {version.git_commit && (
                    <div className="text-xs text-gray-500">
                      Commit: {version.git_commit}
                    </div>
                  )}
                </div>
                
                {versionInfo.canRollback && 
                 versionInfo.current?.version !== version.version && (
                  <button
                    onClick={onRollback}
                    disabled={isRollingBack}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:bg-gray-400"
                  >
                    {isRollingBack ? 'Rolling back...' : 'Rollback'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
