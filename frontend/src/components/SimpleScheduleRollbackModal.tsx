import { useState } from 'react'

interface SimpleScheduleRollbackModalProps {
  deploymentId: string
  isOpen: boolean
  onClose: () => void
}

export const SimpleScheduleRollbackModal = ({ deploymentId, isOpen, onClose }: SimpleScheduleRollbackModalProps) => {
  const [targetVersion, setTargetVersion] = useState(1)
  const [scheduledAt, setScheduledAt] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!scheduledAt) {
      alert('Please select a scheduled time')
      return
    }

    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert(`Rollback scheduled for version ${targetVersion} at ${scheduledAt}`)
      onClose()
      // Reset form
      setTargetVersion(1)
      setScheduledAt('')
      setReason('')
    } catch (error) {
      alert('Failed to schedule rollback')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto shadow-2xl border border-gray-200 pointer-events-auto">
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
              <option value={1}>Version 1 (Current)</option>
              <option value={2}>Version 2 (Previous)</option>
              <option value={3}>Version 3 (Older)</option>
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Rollback'}
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
