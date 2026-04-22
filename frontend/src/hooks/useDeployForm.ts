import { useMutation } from '@tanstack/react-query'
import { createDeployment } from '../api/deployments'

export function useDeployForm() {
  const mutation = useMutation({
    mutationFn: createDeployment,
    onSuccess: (data) => {
      console.log('Deployment created:', data)
    },
    onError: (error) => {
      console.error('Deployment failed:', error)
    }
  })

  return {
    gitUrl: '',
    setGitUrl: () => {},
    isPending: mutation.isPending,
    submitDeployment: mutation.mutate
  }
}
