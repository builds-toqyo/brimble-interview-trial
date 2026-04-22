import { useState } from 'react'
import { SimpleScheduleRollbackModal } from './SimpleScheduleRollbackModal'
import { SimpleTrafficSplitModal } from './SimpleTrafficSplitModal'
import {
  SimpleMultiRegionModal,
  SimpleHealthCheckModal,
  SimplePerformanceModal
} from './SimpleExtraModals'

interface WorkingAdvancedFeaturesButtonProps {
  deploymentId: string
}

export const WorkingAdvancedFeaturesButton = ({ deploymentId }: WorkingAdvancedFeaturesButtonProps) => {
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const openModal = (modal: string) => setActiveModal(modal)
  const closeModal = () => setActiveModal(null)

  return (
    <>
      <div className="flex gap-2 mt-2 flex-wrap">
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

      <SimpleScheduleRollbackModal
        deploymentId={deploymentId}
        isOpen={activeModal === 'scheduled-rollback'}
        onClose={closeModal}
      />
      <SimpleTrafficSplitModal
        deploymentId={deploymentId}
        isOpen={activeModal === 'traffic-split'}
        onClose={closeModal}
      />
      <SimpleMultiRegionModal
        isOpen={activeModal === 'multi-region'}
        onClose={closeModal}
      />
      <SimpleHealthCheckModal
        isOpen={activeModal === 'health-check'}
        onClose={closeModal}
      />
      <SimplePerformanceModal
        isOpen={activeModal === 'performance'}
        onClose={closeModal}
      />
    </>
  )
}
