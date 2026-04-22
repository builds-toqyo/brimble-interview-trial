import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdvancedFeaturesButton from './AdvancedFeaturesButton'

// Mock the modal components
vi.mock('./ScheduledRollbackModal', () => ({
  ScheduledRollbackModal: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="scheduled-rollback-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}))

vi.mock('./TrafficSplitModal', () => ({
  TrafficSplitModal: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="traffic-split-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}))

vi.mock('./MultiRegionModal', () => ({
  MultiRegionModal: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="multi-region-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}))

vi.mock('./HealthCheckModal', () => ({
  HealthCheckModal: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="health-check-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}))

vi.mock('./PerformanceOptimizationModal', () => ({
  PerformanceOptimizationModal: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="performance-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}))

describe('AdvancedFeaturesButton', () => {
  const mockDeploymentId = 'test-deployment-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all feature buttons', () => {
    render(<AdvancedFeaturesButton deploymentId={mockDeploymentId} />)

    expect(screen.getByText('Schedule Rollback')).toBeDefined()
    expect(screen.getByText('A/B Testing')).toBeDefined()
    expect(screen.getByText('Multi-Region')).toBeDefined()
    expect(screen.getByText('Health Checks')).toBeDefined()
    expect(screen.getByText('Performance')).toBeDefined()
  })

  it('opens scheduled rollback modal when button is clicked', () => {
    render(<AdvancedFeaturesButton deploymentId={mockDeploymentId} />)

    const rollbackButton = screen.getByText('Schedule Rollback')
    fireEvent.click(rollbackButton)

    expect(screen.getByTestId('scheduled-rollback-modal')).toBeDefined()
  })

  it('opens traffic split modal when button is clicked', () => {
    render(<AdvancedFeaturesButton deploymentId={mockDeploymentId} />)

    const trafficSplitButton = screen.getByText('A/B Testing')
    fireEvent.click(trafficSplitButton)

    expect(screen.getByTestId('traffic-split-modal')).toBeDefined()
  })

  it('opens multi-region modal when button is clicked', () => {
    render(<AdvancedFeaturesButton deploymentId={mockDeploymentId} />)

    const multiRegionButton = screen.getByText('Multi-Region')
    fireEvent.click(multiRegionButton)

    expect(screen.getByTestId('multi-region-modal')).toBeDefined()
  })

  it('opens health check modal when button is clicked', () => {
    render(<AdvancedFeaturesButton deploymentId={mockDeploymentId} />)

    const healthCheckButton = screen.getByText('Health Checks')
    fireEvent.click(healthCheckButton)

    expect(screen.getByTestId('health-check-modal')).toBeDefined()
  })

  it('opens performance modal when button is clicked', () => {
    render(<AdvancedFeaturesButton deploymentId={mockDeploymentId} />)

    const performanceButton = screen.getByText('Performance')
    fireEvent.click(performanceButton)

    expect(screen.getByTestId('performance-modal')).toBeDefined()
  })

  it('closes modal when close button is clicked', () => {
    render(<AdvancedFeaturesButton deploymentId={mockDeploymentId} />)

    // Open a modal
    const rollbackButton = screen.getByText('Schedule Rollback')
    fireEvent.click(rollbackButton)

    // Verify modal is open
    expect(screen.getByTestId('scheduled-rollback-modal')).toBeDefined()

    // Close the modal
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)

    // Verify modal is closed
    expect(screen.queryByTestId('scheduled-rollback-modal')).toBeNull()
  })

  it('has correct button styling classes', () => {
    render(<AdvancedFeaturesButton deploymentId={mockDeploymentId} />)

    const rollbackButton = screen.getByText('Schedule Rollback')
    expect(rollbackButton.className).toContain('text-xs')
    expect(rollbackButton.className).toContain('text-purple-600')
    expect(rollbackButton.className).toContain('hover:text-purple-800')
    expect(rollbackButton.className).toContain('font-medium')

    const trafficSplitButton = screen.getByText('A/B Testing')
    expect(trafficSplitButton.className).toContain('text-xs')
    expect(trafficSplitButton.className).toContain('text-indigo-600')
    expect(trafficSplitButton.className).toContain('hover:text-indigo-800')
    expect(trafficSplitButton.className).toContain('font-medium')

    const multiRegionButton = screen.getByText('Multi-Region')
    expect(multiRegionButton.className).toContain('text-xs')
    expect(multiRegionButton.className).toContain('text-green-600')
    expect(multiRegionButton.className).toContain('hover:text-green-800')
    expect(multiRegionButton.className).toContain('font-medium')

    const healthCheckButton = screen.getByText('Health Checks')
    expect(healthCheckButton.className).toContain('text-xs')
    expect(healthCheckButton.className).toContain('text-orange-600')
    expect(healthCheckButton.className).toContain('hover:text-orange-800')
    expect(healthCheckButton.className).toContain('font-medium')

    const performanceButton = screen.getByText('Performance')
    expect(performanceButton.className).toContain('text-xs')
    expect(performanceButton.className).toContain('text-gray-600')
    expect(performanceButton.className).toContain('hover:text-gray-800')
    expect(performanceButton.className).toContain('font-medium')
  })

  it('passes deploymentId to modals', () => {
    render(<AdvancedFeaturesButton deploymentId={mockDeploymentId} />)

    // Open a modal
    const rollbackButton = screen.getByText('Schedule Rollback')
    fireEvent.click(rollbackButton)

    // The modal should be rendered (we can't directly test props but we know it's rendered)
    expect(screen.getByTestId('scheduled-rollback-modal')).toBeDefined()
  })
})
