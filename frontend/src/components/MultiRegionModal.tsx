import { useMultiRegion } from '../hooks/useMultiRegion'

interface MultiRegionModalProps {
  deploymentId: string
  isOpen: boolean
  onClose: () => void
}

export const MultiRegionModal = ({ deploymentId, isOpen, onClose }: MultiRegionModalProps) => {
  const {
    showCreateRegion,
    newRegion,
    regions,
    deploymentRegions,
    versionInfo,
    toggleCreateRegion,
    setRegionName,
    setRegionEndpoint,
    setRegionCode,
    handleCreateRegion,
    handleDeployToRegion,
    isCreatingRegion,
    isDeploying
  } = useMultiRegion(deploymentId, isOpen)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Multi-Region Deployment</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Regions</h4>
              <button
                onClick={toggleCreateRegion}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Region
              </button>
            </div>
            
            {showCreateRegion && (
              <div className="border rounded p-3 mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="Region Name"
                  value={newRegion.name}
                  onChange={(e) => setRegionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Endpoint URL"
                  value={newRegion.endpoint}
                  onChange={(e) => setRegionEndpoint(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Region Code (e.g., us-east-1)"
                  value={newRegion.regionCode}
                  onChange={(e) => setRegionCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateRegion}
                    disabled={isCreatingRegion}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Create
                  </button>
                  <button
                    onClick={toggleCreateRegion}
                    className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-2">
              {regions?.map((region) => (
                <div key={region.id} className="border rounded p-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{region.name}</div>
                    <div className="text-sm text-gray-600">{region.region_code}</div>
                    <div className="text-xs text-gray-500">{region.endpoint}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleDeployToRegion(region.id, Number(e.target.value))
                        }
                      }}
                    >
                      <option value="">Deploy...</option>
                      {versionInfo?.versions.map((v) => (
                        <option key={v.version} value={v.version}>v{v.version}</option>
                      ))}
                    </select>
                    <span className={`px-2 py-1 rounded text-xs ${
                      region.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {region.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {deploymentRegions && deploymentRegions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Current Deployments</h4>
              <div className="space-y-2">
                {deploymentRegions.map((dr) => (
                  <div key={dr.id} className="border rounded p-2 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{dr.name}</div>
                      <div className="text-sm text-gray-600">Version {dr.version}</div>
                      <div className="text-xs text-gray-500">{dr.endpoint_url}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      dr.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {dr.status}
                    </span>
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
