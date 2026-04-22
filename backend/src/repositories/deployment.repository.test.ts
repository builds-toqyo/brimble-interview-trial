import { DeploymentRepository } from './deployment.repository'
import { ValidationError, NotFoundError, DatabaseError } from '../types'

// Mock the database functions
jest.mock('../db', () => ({
  insertDeployment: jest.fn(),
  listDeployments: jest.fn(),
  getDeployment: jest.fn(),
  updateDeployment: jest.fn(),
  getLogs: jest.fn(),
  getDeploymentVersions: jest.fn(),
  getCurrentVersion: jest.fn(),
  getPreviousVersion: jest.fn(),
  createDeploymentVersion: jest.fn(),
  updateDeploymentVersion: jest.fn(),
  getDeploymentVersion: jest.fn(),
  setCurrentVersion: jest.fn(),
  appendLog: jest.fn()
}))

import * as db from '../db'

describe('DeploymentRepository', () => {
  let repository: DeploymentRepository

  beforeEach(() => {
    repository = new DeploymentRepository()
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create a deployment successfully', async () => {
      const mockId = 'test-id'
      const mockData = { gitUrl: 'https://github.com/test/repo.git' }
      
      ;(db.insertDeployment as jest.Mock).mockImplementation(() => {})
      jest.spyOn(repository as any, 'generateId').mockReturnValue(mockId)

      const result = await repository.create(mockData)

      expect(db.insertDeployment).toHaveBeenCalledWith({
        id: mockId,
        git_url: mockData.gitUrl,
        project_name: null
      })
      expect(result).toEqual({
        id: mockId,
        message: 'Deployment created successfully'
      })
    })

    it('should create a deployment with project name', async () => {
      const mockId = 'test-id'
      const mockData = { projectName: 'test-project' }
      
      ;(db.insertDeployment as jest.Mock).mockImplementation(() => {})
      jest.spyOn(repository as any, 'generateId').mockReturnValue(mockId)

      const result = await repository.create(mockData)

      expect(db.insertDeployment).toHaveBeenCalledWith({
        id: mockId,
        git_url: null,
        project_name: mockData.projectName
      })
      expect(result).toEqual({
        id: mockId,
        message: 'Deployment created successfully'
      })
    })

    it('should throw DatabaseError on database failure', async () => {
      const mockData = { gitUrl: 'https://github.com/test/repo.git' }
      const dbError = new Error('Database connection failed')
      
      ;(db.insertDeployment as jest.Mock).mockImplementation(() => {
        throw dbError
      })

      await expect(repository.create(mockData)).rejects.toThrow(DatabaseError)
    })
  })

  describe('findAll', () => {
    it('should return all deployments', async () => {
      const mockDeployments = [
        { id: '1', git_url: 'https://github.com/test/repo1.git', project_name: 'project1' },
        { id: '2', git_url: 'https://github.com/test/repo2.git', project_name: 'project2' }
      ]
      
      ;(db.listDeployments as jest.Mock).mockReturnValue(mockDeployments)

      const result = await repository.findAll()

      expect(db.listDeployments).toHaveBeenCalled()
      expect(result).toEqual(mockDeployments)
    })

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database query failed')
      ;(db.listDeployments as jest.Mock).mockImplementation(() => {
        throw dbError
      })

      await expect(repository.findAll()).rejects.toThrow(DatabaseError)
    })
  })

  describe('findById', () => {
    it('should return a deployment when found', async () => {
      const mockDeployment = { id: '1', git_url: 'https://github.com/test/repo.git', project_name: 'project' }
      ;(db.getDeployment as jest.Mock).mockReturnValue(mockDeployment)

      const result = await repository.findById('1')

      expect(db.getDeployment).toHaveBeenCalledWith('1')
      expect(result).toEqual(mockDeployment)
    })

    it('should throw NotFoundError when deployment not found', async () => {
      ;(db.getDeployment as jest.Mock).mockReturnValue(null)

      await expect(repository.findById('nonexistent')).rejects.toThrow(NotFoundError)
    })

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database query failed')
      ;(db.getDeployment as jest.Mock).mockImplementation(() => {
        throw dbError
      })

      await expect(repository.findById('1')).rejects.toThrow(DatabaseError)
    })
  })

  describe('update', () => {
    it('should update a deployment successfully', async () => {
      const mockDeployment = { id: '1', git_url: 'https://github.com/test/repo.git', project_name: 'project' }
      const updateData = { status: 'running' as const }
      
      ;(db.getDeployment as jest.Mock).mockReturnValue(mockDeployment)
      ;(db.updateDeployment as jest.Mock).mockImplementation(() => {})

      await repository.update('1', updateData)

      expect(db.getDeployment).toHaveBeenCalledWith('1')
      expect(db.updateDeployment).toHaveBeenCalledWith('1', updateData)
    })

    it('should throw NotFoundError when deployment not found', async () => {
      ;(db.getDeployment as jest.Mock).mockReturnValue(null)

      await expect(repository.update('nonexistent', { status: 'running' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('getVersions', () => {
    it('should return version info for a deployment', async () => {
      const mockDeployment = { id: '1', git_url: 'https://github.com/test/repo.git', project_name: 'project' }
      const mockVersions = [
        { id: 1, version: 1, status: 'running' },
        { id: 2, version: 2, status: 'pending' }
      ]
      const mockCurrent = { id: 2, version: 2, status: 'pending' }
      const mockPrevious = { id: 1, version: 1, status: 'running' }
      
      ;(db.getDeployment as jest.Mock).mockReturnValue(mockDeployment)
      ;(db.getDeploymentVersions as jest.Mock).mockReturnValue(mockVersions)
      ;(db.getCurrentVersion as jest.Mock).mockReturnValue(mockCurrent)
      ;(db.getPreviousVersion as jest.Mock).mockReturnValue(mockPrevious)

      const result = await repository.getVersions('1')

      expect(result).toEqual({
        versions: mockVersions,
        current: mockCurrent,
        previous: mockPrevious,
        canRollback: true
      })
    })

    it('should return canRollback as false when no previous version', async () => {
      const mockDeployment = { id: '1', git_url: 'https://github.com/test/repo.git', project_name: 'project' }
      const mockVersions = [{ id: 1, version: 1, status: 'running' }]
      
      ;(db.getDeployment as jest.Mock).mockReturnValue(mockDeployment)
      ;(db.getDeploymentVersions as jest.Mock).mockReturnValue(mockVersions)
      ;(db.getCurrentVersion as jest.Mock).mockReturnValue(mockVersions[0])
      ;(db.getPreviousVersion as jest.Mock).mockReturnValue(null)

      const result = await repository.getVersions('1')

      expect(result.canRollback).toBe(false)
    })
  })

  describe('getLogs', () => {
    it('should return logs for a deployment', async () => {
      const mockDeployment = { id: '1', git_url: 'https://github.com/test/repo.git', project_name: 'project' }
      const mockLogs = ['Log line 1', 'Log line 2']
      
      ;(db.getDeployment as jest.Mock).mockReturnValue(mockDeployment)
      ;(db.getLogs as jest.Mock).mockReturnValue(mockLogs)

      const result = await repository.getLogs('1')

      expect(result).toEqual(mockLogs)
    })

    it('should throw NotFoundError when deployment not found', async () => {
      ;(db.getDeployment as jest.Mock).mockReturnValue(null)

      await expect(repository.getLogs('nonexistent')).rejects.toThrow(NotFoundError)
    })
  })

  describe('appendLog', () => {
    it('should append a log to a deployment', async () => {
      const mockDeployment = { id: '1', git_url: 'https://github.com/test/repo.git', project_name: 'project' }
      
      ;(db.getDeployment as jest.Mock).mockReturnValue(mockDeployment)
      ;(db.appendLog as jest.Mock).mockImplementation(() => {})

      await repository.appendLog('1', 'Test log message')

      expect(db.getDeployment).toHaveBeenCalledWith('1')
      expect(db.appendLog).toHaveBeenCalledWith('1', 'Test log message')
    })

    it('should throw NotFoundError when deployment not found', async () => {
      ;(db.getDeployment as jest.Mock).mockReturnValue(null)

      await expect(repository.appendLog('nonexistent', 'Test log')).rejects.toThrow(NotFoundError)
    })
  })
})
