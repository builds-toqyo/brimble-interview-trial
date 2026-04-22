export interface CreateDeploymentRequest {
  gitUrl?: string
  projectName?: string
}

export interface CreateDeploymentResponse {
  id: string
  message: string
}

export interface DeploymentResponse {
  id: string
  git_url: string | null
  project_name: string | null
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed' | 'stopping' | 'stopped'
  current_version: number | null
  container_id: string | null
  host_port: number | null
  live_url: string | null
  created_at: string
  updated_at: string
}

export interface DeploymentVersion {
  id: number
  deployment_id: string
  version: number
  image_tag: string
  git_commit: string | null
  status: DeploymentStatus
  container_id: string | null
  host_port: number | null
  created_at: string
  updated_at: string
}

export interface VersionInfo {
  versions: DeploymentVersion[]
  current?: DeploymentVersion
  previous?: DeploymentVersion
  canRollback: boolean
}

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

// Advanced Features Types
export interface ScheduledRollbackRequest {
  targetVersion: number
  scheduledAt: string
  reason?: string
}

export interface ScheduledRollbackResponse {
  message: string
  id: number
}

export interface ScheduledRollback {
  id: number
  deployment_id: string
  target_version: number
  scheduled_at: string
  reason?: string
  status: 'pending' | 'executed' | 'failed'
  executed_at?: string
  created_at: string
}

export interface TrafficSplitRequest {
  versionA: number
  versionB: number
  weightA: number
}

export interface TrafficSplitResponse {
  message: string
  id: number
}

export interface TrafficSplit {
  id: number
  deployment_id: string
  version_a: number
  version_b: number
  weight_a: number
  weight_b: number
  status: 'inactive' | 'active'
  created_at: string
  updated_at: string
}

export interface RegionRequest {
  name: string
  endpoint: string
  regionCode: string
}

export interface RegionResponse {
  message: string
  id: number
}

export interface Region {
  id: number
  name: string
  endpoint: string
  region_code: string
  is_active: boolean
  created_at: string
}

export interface DeployToRegionRequest {
  regionId: number
  version: number
}

export interface DeployToRegionResponse {
  message: string
  id: number
}

export interface DeploymentRegion {
  id: number
  deployment_id: string
  region_id: number
  version: number
  endpoint_url: string
  status: 'pending' | 'deploying' | 'deployed' | 'failed'
  created_at: string
  updated_at: string
}

export interface HealthCheckRequest {
  version: number
  endpointPath?: string
  method?: 'GET' | 'POST'
  expectedStatus?: number
  timeoutMs?: number
  intervalMs?: number
}

export interface HealthCheckResponse {
  message: string
  id: number
}

export interface HealthCheck {
  id: number
  deployment_id: string
  version: number
  endpoint_path: string
  method: 'GET' | 'POST'
  expected_status: number
  timeout_ms: number
  interval_ms: number
  status: 'healthy' | 'unhealthy' | 'unknown'
  last_check: string | null
  created_at: string
}

export interface PerformanceOptimizationResponse {
  message: string
}

// Common Types
export type DeploymentStatus = 'pending' | 'building' | 'deploying' | 'running' | 'failed' | 'stopping' | 'stopped'

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}

// Error Types
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, 'DATABASE_ERROR')
    this.name = 'DatabaseError'
  }
}
