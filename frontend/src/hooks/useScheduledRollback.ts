import { useReducer } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchVersions, getScheduledRollbacks, scheduleRollback } from '../api/deployments'

interface ScheduledRollbackState {
  targetVersion: number
  scheduledAt: string
  reason: string
}

type ScheduledRollbackAction =
  | { type: 'SET_TARGET_VERSION'; version: number }
  | { type: 'SET_SCHEDULED_AT'; time: string }
  | { type: 'SET_REASON'; reason: string }
  | { type: 'RESET_FORM' }

const scheduledRollbackReducer = (
  state: ScheduledRollbackState, 
  action: ScheduledRollbackAction
): ScheduledRollbackState => {
  switch (action.type) {
    case 'SET_TARGET_VERSION':
      return { ...state, targetVersion: action.version }
    case 'SET_SCHEDULED_AT':
      return { ...state, scheduledAt: action.time }
    case 'SET_REASON':
      return { ...state, reason: action.reason }
    case 'RESET_FORM':
      return { targetVersion: 1, scheduledAt: '', reason: '' }
    default:
      return state
  }
}

export const useScheduledRollback = (deploymentId: string, enabled: boolean) => {
  const [state, dispatch] = useReducer(scheduledRollbackReducer, {
    targetVersion: 1,
    scheduledAt: '',
    reason: ''
  })

  const queryClient = useQueryClient()

  const { data: versionInfo } = useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    enabled
  })

  const { data: scheduledRollbacks } = useQuery({
    queryKey: ['scheduled-rollbacks', deploymentId],
    queryFn: () => getScheduledRollbacks(deploymentId),
    enabled
  })

  const scheduleMutation = useMutation({
    mutationFn: (data: { targetVersion: number; scheduledAt: string; reason?: string }) =>
      scheduleRollback(deploymentId, data.targetVersion, data.scheduledAt, data.reason),
    onSuccess: () => {
      dispatch({ type: 'RESET_FORM' })
      queryClient.invalidateQueries({ queryKey: ['scheduled-rollbacks', deploymentId] })
    }
  })

  const setTargetVersion = (version: number) => {
    dispatch({ type: 'SET_TARGET_VERSION', version })
  }

  const setScheduledAt = (time: string) => {
    dispatch({ type: 'SET_SCHEDULED_AT', time })
  }

  const setReason = (reason: string) => {
    dispatch({ type: 'SET_REASON', reason })
  }

  const handleSubmit = () => {
    if (state.scheduledAt) {
      scheduleMutation.mutate({
        targetVersion: state.targetVersion,
        scheduledAt: state.scheduledAt,
        reason: state.reason
      })
    }
  }

  return {
    // State
    targetVersion: state.targetVersion,
    scheduledAt: state.scheduledAt,
    reason: state.reason,
    
    // Data
    versionInfo,
    scheduledRollbacks,
    
    // Actions
    setTargetVersion,
    setScheduledAt,
    setReason,
    handleSubmit,
    
    // Status
    isPending: scheduleMutation.isPending,
    canSubmit: state.scheduledAt !== ''
  }
}
