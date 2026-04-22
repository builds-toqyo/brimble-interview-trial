interface SimpleAdvancedFeaturesButtonProps {
  deploymentId: string
}

export const SimpleAdvancedFeaturesButton = ({ deploymentId }: SimpleAdvancedFeaturesButtonProps) => {
  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => alert('Schedule Rollback feature coming soon!')}
        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
      >
        Schedule Rollback
      </button>
      <button
        onClick={() => alert('A/B Testing feature coming soon!')}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        A/B Testing
      </button>
      <button
        onClick={() => alert('Multi-Region feature coming soon!')}
        className="text-xs text-green-600 hover:text-green-800 font-medium"
      >
        Multi-Region
      </button>
      <button
        onClick={() => alert('Health Checks feature coming soon!')}
        className="text-xs text-orange-600 hover:text-orange-800 font-medium"
      >
        Health Checks
      </button>
      <button
        onClick={() => alert('Performance feature coming soon!')}
        className="text-xs text-gray-600 hover:text-gray-800 font-medium"
      >
        Performance
      </button>
    </div>
  )
}
