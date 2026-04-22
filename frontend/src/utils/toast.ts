import { toast as sonnerToast } from 'sonner'

export const showSuccessToast = (message: string, description?: string) => {
  return sonnerToast.success(message, {
    description,
    duration: 4000,
  })
}

export const showErrorToast = (message: string, description?: string) => {
  return sonnerToast.error(message, {
    description,
    duration: 6000,
  })
}

export const showLoadingToast = (message: string, description?: string) => {
  return sonnerToast.loading(message, {
    description,
  })
}

export const showInfoToast = (message: string, description?: string) => {
  return sonnerToast.info(message, {
    description,
    duration: 4000,
  })
}

export const showWarningToast = (message: string, description?: string) => {
  return sonnerToast.warning(message, {
    description,
    duration: 5000,
  })
}

// Specific deployment-related toasts
export const appToast = {
  deployment: {
    creating: () => showLoadingToast('Creating deployment...', 'Initializing your deployment'),
    created: (id: string) => showSuccessToast('Deployment created successfully', `Deployment ID: ${id}`),
    createFailed: (error: string) => showErrorToast('Failed to create deployment', error),
    
    rollingBack: () => showLoadingToast('Rolling back deployment...', 'Reverting to previous version'),
    rollbackSuccess: () => showSuccessToast('Rollback completed successfully', 'Deployment has been reverted'),
    rollbackFailed: (error: string) => showErrorToast('Rollback failed', error),
    
    optimizing: () => showLoadingToast('Optimizing performance...', 'Analyzing and optimizing deployment'),
    optimizeSuccess: () => showSuccessToast('Performance optimization completed', 'Your deployment is now optimized'),
    optimizeFailed: (error: string) => showErrorToast('Performance optimization failed', error),
  },
  
  features: {
    schedulingRollback: () => showLoadingToast('Scheduling rollback...', 'Setting up scheduled rollback'),
    rollbackScheduled: (id: string) => showSuccessToast('Rollback scheduled successfully', `Schedule ID: ${id}`),
    scheduleFailed: (error: string) => showErrorToast('Failed to schedule rollback', error),
    
    creatingTrafficSplit: () => showLoadingToast('Creating traffic split...', 'Setting up traffic distribution'),
    trafficSplitCreated: (id: string) => showSuccessToast('Traffic split created successfully', `Split ID: ${id}`),
    trafficSplitFailed: (error: string) => showErrorToast('Failed to create traffic split', error),
    
    startingHealthCheck: () => showLoadingToast('Starting health check...', 'Initializing health monitoring'),
    healthCheckStarted: (id: string) => showSuccessToast('Health check started successfully', `Check ID: ${id}`),
    healthCheckFailed: (error: string) => showErrorToast('Failed to start health check', error),
    
    deployingMultiRegion: () => showLoadingToast('Deploying to multiple regions...', 'Setting up global deployment'),
    multiRegionDeployed: (id: string) => showSuccessToast('Multi-region deployment completed', `Deployment ID: ${id}`),
    multiRegionFailed: (error: string) => showErrorToast('Multi-region deployment failed', error),
  },
  
  general: {
    loading: (message: string) => showLoadingToast(message),
    success: (message: string) => showSuccessToast(message),
    error: (message: string) => showErrorToast(message),
    info: (message: string) => showInfoToast(message),
    warning: (message: string) => showWarningToast(message),
  }
}

export { sonnerToast as toast }
