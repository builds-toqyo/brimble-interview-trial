import { useReducer } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchVersions, createTrafficSplit } from '../api/deployments'

interface TrafficSplitState {
  versionA: number
  versionB: number
  weightA: number
}

type TrafficSplitAction =
  | { type: 'SET_VERSION_A'; version: number }
  | { type: 'SET_VERSION_B'; version: number }
  | { type: 'SET_WEIGHT_A'; weight: number }
  | { type: 'RESET_FORM' }

const trafficSplitReducer = (
  state: TrafficSplitState,
  action: TrafficSplitAction
): TrafficSplitState => {
  switch (action.type) {
    case 'SET_VERSION_A':
      return { ...state, versionA: action.version }
    case 'SET_VERSION_B':
      return { ...state, versionB: action.version }
    case 'SET_WEIGHT_A':
      return { ...state, weightA: action.weight }
    case 'RESET_FORM':
      return { versionA: 1, versionB: 1, weightA: 50 }
    default:
      return state
  }
}

export const useTrafficSplit = (deploymentId: string, enabled: boolean) => {
  const [state, dispatch] = useReducer(trafficSplitReducer, {
    versionA: 1,
    versionB: 1,
    weightA: 50
  })

  const queryClient = useQueryClient()

  const { data: versionInfo } = useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    enabled
  })

  const createMutation = useMutation({
    mutationFn: () => createTrafficSplit(deploymentId, state.versionA, state.versionB, state.weightA),
    onSuccess: () => {
      dispatch({ type: 'RESET_FORM' })
      queryClient.invalidateQueries({ queryKey: ['traffic-splits', deploymentId] })
    }
  })

  const setVersionA = (version: number) => {
    dispatch({ type: 'SET_VERSION_A', version })
  }

  const setVersionB = (version: number) => {
    dispatch({ type: 'SET_VERSION_B', version })
  }

  const setWeightA = (weight: number) => {
    dispatch({ type: 'SET_WEIGHT_A', weight })
  }

  const handleSubmit = () => {
    createMutation.mutate()
  }

  return {
    // State
    versionA: state.versionA,
    versionB: state.versionB,
    weightA: state.weightA,
    weightB: 100 - state.weightA,
    
    // Data
    versionInfo,
    
    // Actions
    setVersionA,
    setVersionB,
    setWeightA,
    handleSubmit,
    
    // Status
    isPending: createMutation.isPending
  }
}
