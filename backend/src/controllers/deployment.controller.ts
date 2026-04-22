import { Request, Response } from 'express'
import { DeploymentRepository } from '../repositories/deployment.repository'
import { runDeployment, rollbackDeployment } from '../pipeline'
import { emitLog } from '../events'
import type {
  CreateDeploymentRequest,
  ApiResponse,
  DeploymentResponse,
  VersionInfo
} from '../types'
import { ValidationError, NotFoundError } from '../types'

export class DeploymentController {
  private repository: DeploymentRepository

  constructor() {
    this.repository = new DeploymentRepository()
  }

  // GET /api/deployments
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const deployments = await this.repository.findAll()
      res.json({ data: deployments })
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // POST /api/deployments
  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = this.validateCreateRequest(req.body)
      const result = await this.repository.create(data)
      
      // Start deployment process asynchronously
      this.startDeployment(result.id)
      
      res.status(201).json({ data: result })
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // GET /api/deployments/:id
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = this.validateIdParam(req.params)
      const deployment = await this.repository.findById(id)
      res.json({ data: deployment })
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // POST /api/deployments/:id/rollback
  async rollback(req: Request, res: Response): Promise<void> {
    try {
      const { id } = this.validateIdParam(req.params)
      
      // Start rollback process
      await rollbackDeployment(id)
      
      res.json({ message: 'Rollback initiated successfully' })
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // GET /api/deployments/:id/versions
  async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = this.validateIdParam(req.params)
      const versions = await this.repository.getVersions(id)
      res.json({ data: versions })
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // GET /api/deployments/:id/logs
  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = this.validateIdParam(req.params)
      const logs = await this.repository.getLogs(id)
      res.json({ data: logs })
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // Private helper methods
  private validateCreateRequest(body: any): CreateDeploymentRequest {
    const { gitUrl, projectName } = body || {}
    
    if (!gitUrl && !projectName) {
      throw new ValidationError('gitUrl or projectName is required')
    }
    
    // Validate gitUrl format if provided
    if (gitUrl && !gitUrl.startsWith('https://github.com/') && !gitUrl.startsWith('http://') && !gitUrl.startsWith('https://')) {
      throw new ValidationError('Invalid git URL format')
    }
    
    return { gitUrl, projectName }
  }

  private validateIdParam(params: any): { id: string } {
    const { id } = params
    
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Valid deployment ID is required')
    }
    
    return { id }
  }

  private async startDeployment(deploymentId: string): Promise<void> {
    try {
      // Get deployment details to retrieve gitUrl
      const deployment = await this.repository.findById(deploymentId)
      const gitUrl = deployment.git_url || ''
      
      await runDeployment(deploymentId, gitUrl)
    } catch (error) {
      emitLog(deploymentId, `Deployment failed: ${(error as Error).message}`)
    }
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message })
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message })
    } else if (error instanceof Error) {
      res.status(500).json({ error: 'Internal server error' })
    } else {
      res.status(500).json({ error: 'Unknown error occurred' })
    }
  }
}
