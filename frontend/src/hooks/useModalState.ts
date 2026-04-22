import { useReducer } from 'react'

type ModalType = 'scheduled-rollback' | 'traffic-split' | 'multi-region' | 'health-check' | 'performance' | ''

interface ModalState {
  activeModal: ModalType
  isOpen: boolean
}

type ModalAction = 
  | { type: 'OPEN_MODAL'; modal: ModalType }
  | { type: 'CLOSE_MODAL' }

const modalReducer = (state: ModalState, action: ModalAction): ModalState => {
  switch (action.type) {
    case 'OPEN_MODAL':
      return {
        activeModal: action.modal,
        isOpen: true
      }
    case 'CLOSE_MODAL':
      return {
        activeModal: '',
        isOpen: false
      }
    default:
      return state
  }
}

export const useModalState = () => {
  const [state, dispatch] = useReducer(modalReducer, {
    activeModal: '',
    isOpen: false
  })

  const openModal = (modal: ModalType) => {
    dispatch({ type: 'OPEN_MODAL', modal })
  }

  const closeModal = () => {
    dispatch({ type: 'CLOSE_MODAL' })
  }

  const isModalOpen = (modal: ModalType) => {
    return state.activeModal === modal && state.isOpen
  }

  return {
    activeModal: state.activeModal,
    isOpen: state.isOpen,
    openModal,
    closeModal,
    isModalOpen
  }
}
