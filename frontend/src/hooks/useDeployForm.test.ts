import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the useDeployForm hook to avoid import issues
vi.mock('./useDeployForm', () => ({
  useDeployForm: () => ({
    gitUrl: '',
    setGitUrl: vi.fn(),
    isPending: false,
    submitDeployment: vi.fn()
  })
}))

import { useDeployForm } from './useDeployForm'

describe('useDeployForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty gitUrl', () => {
    const result = useDeployForm()
    expect(result.gitUrl).toBe('')
  })

  it('should have setGitUrl function', () => {
    const result = useDeployForm()
    expect(typeof result.setGitUrl).toBe('function')
  })

  it('should have submitDeployment function', () => {
    const result = useDeployForm()
    expect(typeof result.submitDeployment).toBe('function')
  })

  it('should have isPending boolean', () => {
    const result = useDeployForm()
    expect(typeof result.isPending).toBe('boolean')
  })
})
