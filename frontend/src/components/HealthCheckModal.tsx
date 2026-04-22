import { useHealthCheck } from '../hooks/useHealthCheck'

interface HealthCheckModalProps {
  deploymentId: string
  isOpen: boolean
  onClose: () => void
}

export const HealthCheckModal = ({ deploymentId, isOpen, onClose }: HealthCheckModalProps) => {
  const {
    version,
    config,
    versionInfo,
    healthChecks,
    setVersion,
    setEndpointPath,
    setMethod,
    setExpectedStatus,
    setTimeoutMs,
    setIntervalMs,
    handleSubmit,
    isPending
  } = useHealthCheck(deploymentId, isOpen)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Advanced Health Checks</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <div className="space-y-6">
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
                  onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
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
                  onChange={(e) => setEndpointPath(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Expected Status</label>
                <input
                  type="number"
                  value={config.expectedStatus}
                  onChange={(e) => setExpectedStatus(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={config.timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Interval (ms)</label>
                <input
                  type="number"
                  value={config.intervalMs}
                  onChange={(e) => setIntervalMs(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isPending ? 'Creating...' : 'Create Health Check'}
            </button>
          </div>
          
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
                          Status: {check.expected_status} | Timeout: {check.timeout_ms}ms | Interval: {check.interval_ms}ms
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
