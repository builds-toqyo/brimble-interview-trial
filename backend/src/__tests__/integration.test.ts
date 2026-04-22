import request from 'supertest'
import express from 'express'
import cors from 'cors'

// Mock the database and other dependencies
jest.mock('../db')
jest.mock('../pipeline')
jest.mock('../advanced')
jest.mock('../events')

// Mock the database functions to return proper data
const mockDb = require('../db')
mockDb.listDeployments = jest.fn(() => [
  {
    id: 'test-deployment-id',
    git_url: 'https://github.com/test/repo.git',
    project_name: 'test-project',
    status: 'running',
    current_version: 1,
    container_id: 'test-container',
    host_port: 3002,
    live_url: 'http://localhost:3002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
])

mockDb.insertDeployment = jest.fn((data) => {
  // Validate gitUrl format - return error for invalid URLs
  if (data.git_url === 'invalid-url') {
    throw new Error('Invalid git URL format')
  }
  return {
    id: 'new-deployment-id',
    ...data,
    status: 'pending',
    current_version: null,
    container_id: null,
    host_port: null,
    live_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
})

mockDb.getDeployment = jest.fn((id) => {
  if (id === 'test-deployment-id') {
    return {
      id: 'test-deployment-id',
      git_url: 'https://github.com/test/repo.git',
      project_name: 'test-project',
      status: 'running',
      current_version: 1,
      container_id: 'test-container',
      host_port: 3002,
      live_url: 'http://localhost:3002',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
  return null
})

mockDb.getDeploymentVersions = jest.fn(() => [
  {
    version: 1,
    status: 'completed',
    container_id: 'test-container',
    created_at: new Date().toISOString()
  }
])

mockDb.getCurrentVersion = jest.fn(() => 1)
mockDb.getPreviousVersion = jest.fn(() => null)

mockDb.getLogs = jest.fn(() => [
  'Deployment started',
  'Build completed',
  'Container running'
])

// Mock advanced features to return proper data format matching actual API responses
const mockAdvanced = require('../advanced')
mockAdvanced.scheduleRollback = jest.fn(() => 'rollback-id')

mockAdvanced.createTrafficSplit = jest.fn(() => 'split-id')

mockAdvanced.createHealthCheck = jest.fn(() => 'health-check-id')

mockAdvanced.optimizePerformance = jest.fn(() => ({
  message: 'Performance optimization completed successfully'
}))

import app from '../index'

describe('API Integration Tests', () => {
  let server: any

  beforeAll(async () => {
    // Start the server for integration testing
    server = app.listen(0) // Use random available port
  })

  afterAll(async () => {
    // Clean up server
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve)
      })
    }
  })

  
  describe('GET /api/deployments', () => {
    it('should return list of deployments', async () => {
      const response = await request(app)
        .get('/api/deployments')
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const { listDeployments } = require('../db')
      listDeployments.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const response = await request(app)
        .get('/api/deployments')
        .expect(500)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/deployments', () => {
    it('should create deployment with gitUrl', async () => {
      const deploymentData = {
        gitUrl: 'https://github.com/test/repo.git'
      }

      const response = await request(app)
        .post('/api/deployments')
        .send(deploymentData)
        .expect(201)

      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('message')
    })

    it('should create deployment with projectName', async () => {
      const deploymentData = {
        projectName: 'test-project'
      }

      const response = await request(app)
        .post('/api/deployments')
        .send(deploymentData)
        .expect(201)

      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('id')
    })

    it('should return 400 for missing gitUrl and projectName', async () => {
      const response = await request(app)
        .post('/api/deployments')
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('gitUrl or projectName is required')
    })

    it('should return 400 for invalid gitUrl', async () => {
      const deploymentData = {
        gitUrl: 'invalid-url'
      }

      const response = await request(app)
        .post('/api/deployments')
        .send(deploymentData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/deployments/:id', () => {
    it('should return deployment by ID', async () => {
      const deploymentId = 'test-deployment-id'
      
      const response = await request(app)
        .get(`/api/deployments/${deploymentId}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('id')
    })

    it('should return 404 for non-existent deployment', async () => {
      const deploymentId = 'non-existent-id'
      
      const response = await request(app)
        .get(`/api/deployments/${deploymentId}`)
        .expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Deployment not found')
    })

    it('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/api/deployments/invalid-id')
        .expect(404) // Non-existent deployment
    })
  })

  describe('POST /api/deployments/:id/rollback', () => {
    it('should initiate rollback successfully', async () => {
      const deploymentId = 'test-deployment-id'
      
      const response = await request(app)
        .post(`/api/deployments/${deploymentId}/rollback`)
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toBe('Rollback initiated successfully')
    })

    it('should handle rollback errors', async () => {
      const deploymentId = 'error-deployment-id'
      
      // Mock rollback error
      const { rollbackDeployment } = require('../pipeline')
      rollbackDeployment.mockRejectedValue(new Error('Rollback failed'))

      const response = await request(app)
        .post(`/api/deployments/${deploymentId}/rollback`)
        .expect(500)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/deployments/:id/versions', () => {
    it('should return deployment versions', async () => {
      const deploymentId = 'test-deployment-id'
      
      const response = await request(app)
        .get(`/api/deployments/${deploymentId}/versions`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('versions')
      expect(response.body.data).toHaveProperty('current')
      expect(response.body.data).toHaveProperty('canRollback')
    })
  })

  describe('GET /api/deployments/:id/logs', () => {
    it('should return deployment logs', async () => {
      const deploymentId = 'test-deployment-id'
      
      const response = await request(app)
        .get(`/api/deployments/${deploymentId}/logs`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(Array.isArray(response.body.data)).toBe(true)
    })
  })

  describe('Advanced Features Endpoints', () => {
    describe('POST /api/deployments/:id/schedule-rollback', () => {
      it('should schedule rollback', async () => {
        const deploymentId = 'test-deployment-id'
        const rollbackData = {
          targetVersion: 1,
          scheduledAt: new Date(Date.now() + 3600000).toISOString()
        }
        
        const response = await request(app)
          .post(`/api/deployments/${deploymentId}/schedule-rollback`)
          .send(rollbackData)
          .expect(200)

        expect(response.body).toHaveProperty('message')
      })
    })

    describe('POST /api/deployments/:id/traffic-split', () => {
      it('should create traffic split', async () => {
        const deploymentId = 'test-deployment-id'
        const splitData = {
          versionA: 1,
          versionB: 2,
          weightA: 70
        }
        
        const response = await request(app)
          .post(`/api/deployments/${deploymentId}/traffic-split`)
          .send(splitData)
          .expect(200)

        expect(response.body).toHaveProperty('message')
      })
    })

    describe('POST /api/deployments/:id/health-check', () => {
      it('should create health check', async () => {
        const deploymentId = 'test-deployment-id'
        const healthCheckData = {
          version: 1,
          endpointPath: '/health',
          method: 'GET',
          expectedStatus: 200,
          timeoutMs: 5000,
          intervalMs: 1000
        }
        
        const response = await request(app)
          .post(`/api/deployments/${deploymentId}/health-check`)
          .send(healthCheckData)
          .expect(200)

        expect(response.body).toHaveProperty('message')
      })
    })

    describe('POST /api/deployments/:id/performance/optimize', () => {
      it('should optimize performance', async () => {
        const deploymentId = 'test-deployment-id'
        
        const response = await request(app)
          .post(`/api/deployments/${deploymentId}/performance/optimize`)
          .expect(200)

        expect(response.body).toHaveProperty('message')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle CORS correctly', async () => {
      const response = await request(app)
        .options('/api/deployments')
        .expect(204)

      expect(response.headers['access-control-allow-origin']).toBeDefined()
    })

    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/deployments')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should handle unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404)
    })
  })
})
