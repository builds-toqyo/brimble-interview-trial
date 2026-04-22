import { useScheduledRollback } from '../hooks/useScheduledRollback'

interface ScheduledRollbackModalProps {
  deploymentId: string
  isOpen: boolean
  onClose: () => void
}

export const ScheduledRollbackModal = ({ deploymentId, isOpen, onClose }: ScheduledRollbackModalProps) => {
  const {
    targetVersion,
    scheduledAt,
    reason,
    versionInfo,
    scheduledRollbacks,
    setTargetVersion,
    setScheduledAt,
    setReason,
    handleSubmit,
    isPending,
    canSubmit
  } = useScheduledRollback(deploymentId, isOpen)

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
              onClick={handleSubmit}
              disabled={isPending || !canSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isPending ? 'Scheduling...' : 'Schedule Rollback'}
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
