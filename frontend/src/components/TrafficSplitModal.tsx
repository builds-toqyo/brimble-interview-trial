import { useTrafficSplit } from '../hooks/useTrafficSplit'

interface TrafficSplitModalProps {
  deploymentId: string
  isOpen: boolean
  onClose: () => void
}

export const TrafficSplitModal = ({ deploymentId, isOpen, onClose }: TrafficSplitModalProps) => {
  const {
    versionA,
    versionB,
    weightA,
    weightB,
    versionInfo,
    setVersionA,
    setVersionB,
    setWeightA,
    handleSubmit,
    isPending
  } = useTrafficSplit(deploymentId, isOpen)

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
              Traffic Split: {weightA}% / {weightB}%
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
              onClick={handleSubmit}
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isPending ? 'Creating...' : 'Create Split'}
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
