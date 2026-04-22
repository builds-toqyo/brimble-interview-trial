import { cn } from '../utils/cn'

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'card' | 'text' | 'button'
}

export const Skeleton = ({ className, variant = 'default' }: SkeletonProps) => {
  const variantClasses = {
    default: 'h-4 w-full',
    card: 'h-24 w-full rounded-lg',
    text: 'h-4 w-3/4',
    button: 'h-10 w-24 rounded-md'
  }

  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        variantClasses[variant],
        className
      )}
    />
  )
}

export const DeploymentCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-12 rounded" />
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          <Skeleton variant="button" />
          <Skeleton variant="button" />
          <Skeleton variant="button" />
        </div>
      </div>
      
      {/* Status indicator bar */}
      <Skeleton className="h-1 w-full" />
    </div>
  )
}

export const DeploymentListSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <DeploymentCardSkeleton key={i} />
      ))}
    </div>
  )
}
