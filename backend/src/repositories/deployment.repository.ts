import {
  insertDeployment,
  listDeployments,
  getDeployment,
  updateDeployment,
  getLogs,
  getDeploymentVersions,
  getCurrentVersion,
  getPreviousVersion,
  createDeploymentVersion,
  updateDeploymentVersion,
  getDeploymentVersion,
  setCurrentVersion,
  appendLog
} from '../db'
import type {
  CreateDeploymentRequest,
  CreateDeploymentResponse,
  DeploymentResponse,
  VersionInfo,
  DeploymentVersion
} from '../types'
import { DatabaseError, NotFoundError } from '../types'

export class DeploymentRepository {
  // Basic deployment operations
  async create(data: CreateDeploymentRequest): Promise<CreateDeploymentResponse> {
    try {
      const id = this.generateId()
      insertDeployment({
        id,
        git_url: data.gitUrl ?? null,
        project_name: data.projectName ?? null,
      })
      return { id, message: 'Deployment created successfully' }
    } catch (error) {
      throw new DatabaseError(`Failed to create deployment: ${(error as Error).message}`)
    }
  }

  async findAll(): Promise<DeploymentResponse[]> {
    try {
      return listDeployments()
    } catch (error) {
      throw new DatabaseError(`Failed to fetch deployments: ${(error as Error).message}`)
    }
  }

  async findById(id: string): Promise<DeploymentResponse> {
    try {
      const deployment = getDeployment(id)
      if (!deployment) {
        throw new NotFoundError('Deployment')
      }
      return deployment
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError(`Failed to fetch deployment: ${(error as Error).message}`)
    }
  }

  async update(id: string, data: Partial<DeploymentResponse>): Promise<void> {
    try {
      await this.findById(id) // Ensure deployment exists
      updateDeployment(id, data)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError(`Failed to update deployment: ${(error as Error).message}`)
    }
  }

  // Version operations
  async getVersions(deploymentId: string): Promise<VersionInfo> {
    try {
      await this.findById(deploymentId) // Ensure deployment exists
      const versions = getDeploymentVersions(deploymentId)
      const current = getCurrentVersion(deploymentId)
      const previous = getPreviousVersion(deploymentId)
      
      return {
        versions,
        current,
        previous,
        canRollback: !!previous
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError(`Failed to fetch versions: ${(error as Error).message}`)
    }
  }

  async createVersion(deploymentId: string, version: number, imageTag: string, gitCommit?: string): Promise<DeploymentVersion> {
    try {
      await this.findById(deploymentId) // Ensure deployment exists
      const id = createDeploymentVersion(deploymentId, version, imageTag, gitCommit)
      const versionData = getDeploymentVersion(deploymentId, version)
      if (!versionData) {
        throw new DatabaseError('Failed to retrieve created version')
      }
      return versionData
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError(`Failed to create version: ${(error as Error).message}`)
    }
  }

  async setCurrentVersion(deploymentId: string, versionId: number): Promise<void> {
    try {
      await this.findById(deploymentId) // Ensure deployment exists
      setCurrentVersion(deploymentId, versionId)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError(`Failed to set current version: ${(error as Error).message}`)
    }
  }

  // Log operations
  async getLogs(deploymentId: string): Promise<string[]> {
    try {
      await this.findById(deploymentId) // Ensure deployment exists
      return getLogs(deploymentId)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError(`Failed to fetch logs: ${(error as Error).message}`)
    }
  }

  async appendLog(deploymentId: string, message: string): Promise<void> {
    try {
      await this.findById(deploymentId) // Ensure deployment exists
      appendLog(deploymentId, message)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError(`Failed to append log: ${(error as Error).message}`)
    }
  }

  // Helper methods
  private generateId(): string {
    return crypto.randomUUID()
  }
}
