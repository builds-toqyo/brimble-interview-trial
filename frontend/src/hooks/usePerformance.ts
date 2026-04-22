import { useMutation, useQueryClient } from '@tanstack/react-query'
import { optimizeDatabase, analyzePerformance } from '../api/deployments'

export const usePerformance = () => {
  const queryClient = useQueryClient()

  const optimizeMutation = useMutation({
    mutationFn: optimizeDatabase,
    onSuccess: () => {
      // Could show success notification or refresh performance metrics
    }
  })

  const analyzeMutation = useMutation({
    mutationFn: analyzePerformance,
    onSuccess: () => {
      // Could display analysis results
    }
  })

  const handleOptimizeDatabase = () => {
    optimizeMutation.mutate()
  }

  const handleAnalyzePerformance = () => {
    analyzeMutation.mutate()
  }

  return {
    handleOptimizeDatabase,
    handleAnalyzePerformance,
    isOptimizing: optimizeMutation.isPending,
    isAnalyzing: analyzeMutation.isPending
  }
}
