import { useState } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
}

const modalWrapper = "fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
const modalCard = "bg-white rounded-lg p-6 max-w-md w-full shadow-2xl border border-gray-200 pointer-events-auto"

export const SimpleMultiRegionModal = ({ isOpen, onClose }: ModalProps) => {
  const [region, setRegion] = useState('us-east-1')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    alert(`Deployment replicated to region: ${region}`)
    setIsSubmitting(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={modalWrapper}>
      <div className={modalCard}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Multi-Region Deployment</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Target Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">EU West (Ireland)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Deploying...' : 'Deploy to Region'}
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const SimpleHealthCheckModal = ({ isOpen, onClose }: ModalProps) => {
  const [endpoint, setEndpoint] = useState('/health')
  const [interval, setInterval] = useState(30)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    alert(`Health check configured: ${endpoint} every ${interval}s`)
    setIsSubmitting(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={modalWrapper}>
      <div className={modalCard}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Health Checks</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Endpoint Path</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Check Interval (seconds)</label>
            <input
              type="number"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              min={5}
              max={600}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Saving...' : 'Save Health Check'}
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const SimplePerformanceModal = ({ isOpen, onClose }: ModalProps) => {
  const [enableCache, setEnableCache] = useState(true)
  const [enableCompression, setEnableCompression] = useState(true)
  const [enableCDN, setEnableCDN] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    alert(`Performance optimizations applied:\nCache: ${enableCache}\nCompression: ${enableCompression}\nCDN: ${enableCDN}`)
    setIsSubmitting(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={modalWrapper}>
      <div className={modalCard}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Performance Optimization</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enableCache} onChange={(e) => setEnableCache(e.target.checked)} />
            <span className="text-sm">Enable Build Cache</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enableCompression} onChange={(e) => setEnableCompression(e.target.checked)} />
            <span className="text-sm">Enable Gzip Compression</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enableCDN} onChange={(e) => setEnableCDN(e.target.checked)} />
            <span className="text-sm">Enable CDN Distribution</span>
          </label>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Applying...' : 'Apply Optimizations'}
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
