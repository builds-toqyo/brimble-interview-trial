import { useReducer } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRegions, createRegion, deployToRegion, getDeploymentRegions, fetchVersions } from '../api/deployments'

interface MultiRegionState {
  showCreateRegion: boolean
  newRegion: {
    name: string
    endpoint: string
    regionCode: string
  }
}

type MultiRegionAction =
  | { type: 'TOGGLE_CREATE_REGION' }
  | { type: 'SET_REGION_NAME'; name: string }
  | { type: 'SET_REGION_ENDPOINT'; endpoint: string }
  | { type: 'SET_REGION_CODE'; code: string }
  | { type: 'RESET_NEW_REGION' }

const multiRegionReducer = (
  state: MultiRegionState,
  action: MultiRegionAction
): MultiRegionState => {
  switch (action.type) {
    case 'TOGGLE_CREATE_REGION':
      return { ...state, showCreateRegion: !state.showCreateRegion }
    case 'SET_REGION_NAME':
      return { ...state, newRegion: { ...state.newRegion, name: action.name } }
    case 'SET_REGION_ENDPOINT':
      return { ...state, newRegion: { ...state.newRegion, endpoint: action.endpoint } }
    case 'SET_REGION_CODE':
      return { ...state, newRegion: { ...state.newRegion, regionCode: action.code } }
    case 'RESET_NEW_REGION':
      return { 
        ...state, 
        showCreateRegion: false,
        newRegion: { name: '', endpoint: '', regionCode: '' }
      }
    default:
      return state
  }
}

export const useMultiRegion = (deploymentId: string, enabled: boolean) => {
  const [state, dispatch] = useReducer(multiRegionReducer, {
    showCreateRegion: false,
    newRegion: {
      name: '',
      endpoint: '',
      regionCode: ''
    }
  })

  const queryClient = useQueryClient()

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      try {
        return await getRegions()
      } catch (error) {
        console.warn('Regions endpoint not available:', error)
        return []
      }
    },
    enabled
  })

  const { data: deploymentRegions } = useQuery({
    queryKey: ['deployment-regions', deploymentId],
    queryFn: async () => {
      try {
        return await getDeploymentRegions(deploymentId)
      } catch (error) {
        console.warn('Deployment regions endpoint not available:', error)
        return []
      }
    },
    enabled
  })

  const { data: versionInfo } = useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    enabled
  })

  const createRegionMutation = useMutation({
    mutationFn: async () => {
      try {
        return await createRegion(state.newRegion.name, state.newRegion.endpoint, state.newRegion.regionCode)
      } catch (error) {
        console.error('Failed to create region:', error)
        throw error
      }
    },
    onSuccess: () => {
      dispatch({ type: 'RESET_NEW_REGION' })
      queryClient.invalidateQueries({ queryKey: ['regions'] })
    },
    onError: (error) => {
      console.error('Create region error:', error)
    }
  })

  const deployMutation = useMutation({
    mutationFn: async (data: { regionId: number; version: number }) => {
      try {
        return await deployToRegion(deploymentId, data.regionId, data.version)
      } catch (error) {
        console.error('Failed to deploy to region:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment-regions', deploymentId] })
    },
    onError: (error) => {
      console.error('Deploy to region error:', error)
    }
  })

  const toggleCreateRegion = () => {
    dispatch({ type: 'TOGGLE_CREATE_REGION' })
  }

  const setRegionName = (name: string) => {
    dispatch({ type: 'SET_REGION_NAME', name })
  }

  const setRegionEndpoint = (endpoint: string) => {
    dispatch({ type: 'SET_REGION_ENDPOINT', endpoint })
  }

  const setRegionCode = (code: string) => {
    dispatch({ type: 'SET_REGION_CODE', code })
  }

  const handleCreateRegion = () => {
    createRegionMutation.mutate()
  }

  const handleDeployToRegion = (regionId: number, version: number) => {
    deployMutation.mutate({ regionId, version })
  }

  return {
    // State
    showCreateRegion: state.showCreateRegion,
    newRegion: state.newRegion,
    
    // Data
    regions,
    deploymentRegions,
    versionInfo,
    
    // Actions
    toggleCreateRegion,
    setRegionName,
    setRegionEndpoint,
    setRegionCode,
    handleCreateRegion,
    handleDeployToRegion,
    
    // Status
    isCreatingRegion: createRegionMutation.isPending,
    isDeploying: deployMutation.isPending
  }
}
