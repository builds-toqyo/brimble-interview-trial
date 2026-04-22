import { usePerformance } from '../hooks/usePerformance'

interface PerformanceOptimizationModalProps {
  isOpen: boolean
  onClose: () => void
}

export const PerformanceOptimizationModal = ({ isOpen, onClose }: PerformanceOptimizationModalProps) => {
  const {
    handleOptimizeDatabase,
    handleAnalyzePerformance,
    isOptimizing,
    isAnalyzing
  } = usePerformance()

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
              onClick={handleOptimizeDatabase}
              disabled={isOptimizing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize Database'}
            </button>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Performance Analysis</h4>
            <p className="text-sm text-gray-600 mb-3">
              Analyze query performance, index usage, and connection pool statistics.
            </p>
            <button
              onClick={handleAnalyzePerformance}
              disabled={isAnalyzing}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Performance'}
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
