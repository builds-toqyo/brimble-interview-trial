import { useState, useEffect, useCallback } from 'react'

interface DeploymentLogsProps {
  id: string
}

export const DeploymentLogs = ({ id }: DeploymentLogsProps) => {
  const [logs, setLogs] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/deployments/${id}/logs`)
      if (response.ok) {
        const data = await response.json()
        // Handle different response formats
        if (Array.isArray(data)) {
          setLogs(data)
        } else if (data && Array.isArray(data.logs)) {
          setLogs(data.logs)
        } else if (data && typeof data === 'object') {
          // If it's an object with a data property containing logs
          if (Array.isArray(data.data)) {
            setLogs(data.data)
          } else {
            // Convert object to string representation
            setLogs([JSON.stringify(data, null, 2)])
          }
        } else {
          // Handle string or other types
          setLogs([String(data)])
        }
      } else {
        console.error('Failed to fetch logs:', response.statusText)
        setLogs(['Error: Failed to load logs'])
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      setLogs(['Error: Network error'])
    }
  }, [id])

  useEffect(() => {
    if (isVisible) {
      fetchLogs()
      const interval = setInterval(fetchLogs, 2000)
      return () => clearInterval(interval)
    }
  }, [isVisible, fetchLogs])

  return (
    <>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        {isVisible ? 'Hide Logs' : 'View Logs'}
      </button>
      
      {isVisible && (
        <div className="mt-3 border rounded p-3 bg-gray-900 text-gray-100 text-xs font-mono max-h-40 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-400">No logs available...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}
