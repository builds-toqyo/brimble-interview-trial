import { useModalState } from '../hooks/useModalState'
import { ScheduledRollbackModal } from './ScheduledRollbackModal'
import { TrafficSplitModal } from './TrafficSplitModal'
import { MultiRegionModal } from './MultiRegionModal'
import { HealthCheckModal } from './HealthCheckModal'
import { PerformanceOptimizationModal } from './PerformanceOptimizationModal'

interface AdvancedFeaturesButtonProps {
  deploymentId: string
}

export const AdvancedFeaturesButton = ({ deploymentId }: AdvancedFeaturesButtonProps) => {
  const { activeModal, openModal, closeModal, isModalOpen } = useModalState()

  return (
    <>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => openModal('scheduled-rollback')}
          className="text-xs text-purple-600 hover:text-purple-800 font-medium"
        >
          Schedule Rollback
        </button>
        <button
          onClick={() => openModal('traffic-split')}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          A/B Testing
        </button>
        <button
          onClick={() => openModal('multi-region')}
          className="text-xs text-green-600 hover:text-green-800 font-medium"
        >
          Multi-Region
        </button>
        <button
          onClick={() => openModal('health-check')}
          className="text-xs text-orange-600 hover:text-orange-800 font-medium"
        >
          Health Checks
        </button>
        <button
          onClick={() => openModal('performance')}
          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
        >
          Performance
        </button>
      </div>
      
      <ScheduledRollbackModal
        deploymentId={deploymentId}
        isOpen={isModalOpen('scheduled-rollback')}
        onClose={closeModal}
      />
      
      <TrafficSplitModal
        deploymentId={deploymentId}
        isOpen={isModalOpen('traffic-split')}
        onClose={closeModal}
      />
      
      <MultiRegionModal
        deploymentId={deploymentId}
        isOpen={isModalOpen('multi-region')}
        onClose={closeModal}
      />
      
      <HealthCheckModal
        deploymentId={deploymentId}
        isOpen={isModalOpen('health-check')}
        onClose={closeModal}
      />
      
      <PerformanceOptimizationModal
        isOpen={isModalOpen('performance')}
        onClose={closeModal}
      />
    </>
  )
}

export default AdvancedFeaturesButton
