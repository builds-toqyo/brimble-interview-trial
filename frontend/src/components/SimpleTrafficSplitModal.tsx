import { useState } from 'react'

interface SimpleTrafficSplitModalProps {
  deploymentId: string
  isOpen: boolean
  onClose: () => void
}

export const SimpleTrafficSplitModal = ({ deploymentId, isOpen, onClose }: SimpleTrafficSplitModalProps) => {
  const [versionA, setVersionA] = useState(1)
  const [versionB, setVersionB] = useState(2)
  const [weightA, setWeightA] = useState(50)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const weightB = 100 - weightA

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert(`A/B Testing created: Version ${versionA} gets ${weightA}% traffic, Version ${versionB} gets ${weightB}% traffic`)
      onClose()
      // Reset form
      setVersionA(1)
      setVersionB(2)
      setWeightA(50)
    } catch (error) {
      alert('Failed to create A/B test')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl border border-gray-200 pointer-events-auto">
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
                <option value={1}>v1</option>
                <option value={2}>v2</option>
                <option value={3}>v3</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Version B</label>
              <select
                value={versionB}
                onChange={(e) => setVersionB(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={1}>v1</option>
                <option value={2}>v2</option>
                <option value={3}>v3</option>
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
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>100% A</span>
              <span>50/50</span>
              <span>100% B</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Creating...' : 'Create Split'}
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
