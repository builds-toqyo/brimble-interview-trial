import { Request, Response } from 'express'
import { DeploymentController } from './deployment.controller'
import { ValidationError, NotFoundError, DatabaseError, DeploymentResponse, DeploymentVersion, VersionInfo } from '../types'

// Mock the repository
jest.mock('../repositories/deployment.repository')
import { DeploymentRepository } from '../repositories/deployment.repository'

// Mock the pipeline functions
jest.mock('../pipeline', () => ({
  runDeployment: jest.fn(),
  rollbackDeployment: jest.fn()
}))

import { runDeployment, rollbackDeployment } from '../pipeline'

// Mock the events module
jest.mock('../events', () => ({
  emitLog: jest.fn()
}))

import { emitLog } from '../events'

describe('DeploymentController', () => {
  let controller: DeploymentController
  let mockRepository: jest.Mocked<DeploymentRepository>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    // Create a mock repository
    mockRepository = {
      findAll: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      getVersions: jest.fn(),
      getLogs: jest.fn(),
      appendLog: jest.fn(),
      createVersion: jest.fn(),
      setCurrentVersion: jest.fn()
    } as any

    controller = new DeploymentController()
    
    // Replace the controller's repository with our mock
    ;(controller as any).repository = mockRepository
    
    // Mock request and response objects
    mockRequest = {}
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
  })

  describe('getAll', () => {
    it('should return all deployments successfully', async () => {
      const mockDeployments: DeploymentResponse[] = [
        { 
          id: '1', 
          git_url: 'https://github.com/test/repo.git', 
          project_name: 'test',
          status: 'running',
          current_version: 1,
          container_id: 'container-123',
          host_port: 3000,
          live_url: 'http://localhost:3000',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      ]
      mockRepository.findAll.mockResolvedValue(mockDeployments)

      await controller.getAll(mockRequest as Request, mockResponse as Response)

      expect(mockRepository.findAll).toHaveBeenCalled()
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockDeployments })
    })

    it('should handle database errors', async () => {
      mockRepository.findAll.mockRejectedValue(new DatabaseError('Database error'))

      await controller.getAll(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    })
  })

  describe('create', () => {
    it('should create deployment with gitUrl', async () => {
      const mockDeployment = { id: '1', message: 'Created' }
      mockRequest.body = { gitUrl: 'https://github.com/test/repo.git' }
      mockRepository.create.mockResolvedValue(mockDeployment)

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(mockRepository.create).toHaveBeenCalledWith({ gitUrl: 'https://github.com/test/repo.git' })
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockDeployment })
    })

    it('should create deployment with projectName', async () => {
      const mockDeployment = { id: '1', message: 'Created' }
      mockRequest.body = { projectName: 'test-project' }
      mockRepository.create.mockResolvedValue(mockDeployment)

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(mockRepository.create).toHaveBeenCalledWith({ projectName: 'test-project' })
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockDeployment })
    })

    it('should return 400 for invalid request', async () => {
      mockRequest.body = {}

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'gitUrl or projectName is required' })
    })

    it('should handle validation errors', async () => {
      mockRequest.body = { gitUrl: 'https://github.com/test/repo.git' }
      mockRepository.create.mockRejectedValue(new ValidationError('Invalid URL'))

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid URL' })
    })
  })

  describe('getById', () => {
    it('should return deployment by ID', async () => {
      const mockDeployment: DeploymentResponse = { 
        id: '1', 
        git_url: 'https://github.com/test/repo.git', 
        project_name: 'test',
        status: 'running',
        current_version: 1,
        container_id: 'container-123',
        host_port: 3000,
        live_url: 'http://localhost:3000',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRequest.params = { id: '1' }
      mockRepository.findById.mockResolvedValue(mockDeployment)

      await controller.getById(mockRequest as Request, mockResponse as Response)

      expect(mockRepository.findById).toHaveBeenCalledWith('1')
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockDeployment })
    })

    it('should return 404 for non-existent deployment', async () => {
      mockRequest.params = { id: 'nonexistent' }
      mockRepository.findById.mockRejectedValue(new NotFoundError('Deployment not found'))

      await controller.getById(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Deployment not found not found' })
    })

    it('should return 400 for invalid ID', async () => {
      mockRequest.params = {}

      await controller.getById(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Valid deployment ID is required' })
    })
  })

  describe('rollback', () => {
    it('should initiate rollback successfully', async () => {
      mockRequest.params = { id: '1' }
      ;(rollbackDeployment as jest.Mock).mockResolvedValue(undefined)

      await controller.rollback(mockRequest as Request, mockResponse as Response)

      expect(rollbackDeployment).toHaveBeenCalledWith('1')
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Rollback initiated successfully' })
    })

    it('should handle rollback errors', async () => {
      mockRequest.params = { id: '1' }
      ;(rollbackDeployment as jest.Mock).mockRejectedValue(new Error('Rollback failed'))

      await controller.rollback(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    })
  })

  describe('getVersions', () => {
    it('should return deployment versions', async () => {
      const mockVersions: VersionInfo = {
        versions: [{ 
          id: 1, 
          deployment_id: '1',
          version: 1, 
          image_tag: 'v1.0.0',
          git_commit: 'abc123',
          status: 'running',
          container_id: 'container-123',
          host_port: 3000,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }],
        current: { 
          id: 1, 
          deployment_id: '1',
          version: 1, 
          image_tag: 'v1.0.0',
          git_commit: 'abc123',
          status: 'running',
          container_id: 'container-123',
          host_port: 3000,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        },
        previous: undefined,
        canRollback: false
      }
      mockRequest.params = { id: '1' }
      mockRepository.getVersions.mockResolvedValue(mockVersions)

      await controller.getVersions(mockRequest as Request, mockResponse as Response)

      expect(mockRepository.getVersions).toHaveBeenCalledWith('1')
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockVersions })
    })
  })

  describe('getLogs', () => {
    it('should return deployment logs', async () => {
      const mockLogs = ['Log line 1', 'Log line 2']
      mockRequest.params = { id: '1' }
      mockRepository.getLogs.mockResolvedValue(mockLogs)

      await controller.getLogs(mockRequest as Request, mockResponse as Response)

      expect(mockRepository.getLogs).toHaveBeenCalledWith('1')
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockLogs })
    })
  })
})
