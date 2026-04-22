import { useReducer } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchVersions, createHealthCheck, getHealthChecks } from '../api/deployments'

interface HealthCheckState {
  version: number
  config: {
    endpointPath: string
    method: 'GET' | 'POST'
    expectedStatus: number
    timeoutMs: number
    intervalMs: number
  }
}

type HealthCheckAction =
  | { type: 'SET_VERSION'; version: number }
  | { type: 'SET_ENDPOINT_PATH'; path: string }
  | { type: 'SET_METHOD'; method: 'GET' | 'POST' }
  | { type: 'SET_EXPECTED_STATUS'; status: number }
  | { type: 'SET_TIMEOUT_MS'; timeout: number }
  | { type: 'SET_INTERVAL_MS'; interval: number }
  | { type: 'RESET_FORM' }

const healthCheckReducer = (
  state: HealthCheckState,
  action: HealthCheckAction
): HealthCheckState => {
  switch (action.type) {
    case 'SET_VERSION':
      return { ...state, version: action.version }
    case 'SET_ENDPOINT_PATH':
      return { ...state, config: { ...state.config, endpointPath: action.path } }
    case 'SET_METHOD':
      return { ...state, config: { ...state.config, method: action.method } }
    case 'SET_EXPECTED_STATUS':
      return { ...state, config: { ...state.config, expectedStatus: action.status } }
    case 'SET_TIMEOUT_MS':
      return { ...state, config: { ...state.config, timeoutMs: action.timeout } }
    case 'SET_INTERVAL_MS':
      return { ...state, config: { ...state.config, intervalMs: action.interval } }
    case 'RESET_FORM':
      return {
        version: 1,
        config: {
          endpointPath: '/health',
          method: 'GET',
          expectedStatus: 200,
          timeoutMs: 5000,
          intervalMs: 30000
        }
      }
    default:
      return state
  }
}

export const useHealthCheck = (deploymentId: string, enabled: boolean) => {
  const [state, dispatch] = useReducer(healthCheckReducer, {
    version: 1,
    config: {
      endpointPath: '/health',
      method: 'GET',
      expectedStatus: 200,
      timeoutMs: 5000,
      intervalMs: 30000
    }
  })

  const queryClient = useQueryClient()

  const { data: versionInfo } = useQuery({
    queryKey: ['versions', deploymentId],
    queryFn: () => fetchVersions(deploymentId),
    enabled
  })

  const { data: healthChecks } = useQuery({
    queryKey: ['health-checks', deploymentId],
    queryFn: () => getHealthChecks(deploymentId),
    enabled
  })

  const createMutation = useMutation({
    mutationFn: () => createHealthCheck(deploymentId, state.version, state.config),
    onSuccess: () => {
      dispatch({ type: 'RESET_FORM' })
      queryClient.invalidateQueries({ queryKey: ['health-checks', deploymentId] })
    }
  })

  const setVersion = (version: number) => {
    dispatch({ type: 'SET_VERSION', version })
  }

  const setEndpointPath = (path: string) => {
    dispatch({ type: 'SET_ENDPOINT_PATH', path })
  }

  const setMethod = (method: 'GET' | 'POST') => {
    dispatch({ type: 'SET_METHOD', method })
  }

  const setExpectedStatus = (status: number) => {
    dispatch({ type: 'SET_EXPECTED_STATUS', status })
  }

  const setTimeoutMs = (timeout: number) => {
    dispatch({ type: 'SET_TIMEOUT_MS', timeout })
  }

  const setIntervalMs = (interval: number) => {
    dispatch({ type: 'SET_INTERVAL_MS', interval })
  }

  const handleSubmit = () => {
    createMutation.mutate()
  }

  return {
    // State
    version: state.version,
    config: state.config,
    
    // Data
    versionInfo,
    healthChecks,
    
    // Actions
    setVersion,
    setEndpointPath,
    setMethod,
    setExpectedStatus,
    setTimeoutMs,
    setIntervalMs,
    handleSubmit,
    
    // Status
    isPending: createMutation.isPending
  }
}
