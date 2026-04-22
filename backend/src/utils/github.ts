/**
 * Utility functions for GitHub URL parsing and project name extraction
 */

/**
 * Extract project name from GitHub URL
 * @param gitUrl GitHub repository URL
 * @returns Project name extracted from URL
 */
export function extractProjectName(gitUrl: string): string {
  if (!gitUrl) return ''
  
  // Remove .git suffix if present
  const cleanUrl = gitUrl.replace(/\.git$/, '')
  
  // Parse GitHub URL patterns
  const patterns = [
    // https://github.com/owner/repo
    /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/.*)?$/,
    // git@github.com:owner/repo
    /git@github\.com:([^\/]+)\/([^\/]+)(?:\.git)?$/,
    // https://github.com/owner/repo.git
    /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\.git$/
  ]
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern)
    if (match && match[2]) {
      return match[2]
    }
  }
  
  // Fallback: try to extract from URL path
  try {
    const url = new URL(cleanUrl)
    const pathParts = url.pathname.split('/').filter(part => part.length > 0)
    if (pathParts.length >= 2) {
      return pathParts[1]
    }
  } catch {
    // Invalid URL, continue to fallback
  }
  
  // Final fallback: extract last part of URL
  const parts = cleanUrl.split('/').filter(part => part.length > 0)
  return parts[parts.length - 1] || ''
}

/**
 * Validate GitHub URL format
 * @param gitUrl URL to validate
 * @returns True if valid GitHub URL
 */
export function isValidGitHubUrl(gitUrl: string): boolean {
  if (!gitUrl) return false
  
  const validPatterns = [
    /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+(?:\.git)?$/,
    /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/$/,
    /^git@github\.com:[\w\-\.]+\/[\w\-\.]+(?:\.git)?$/
  ]
  
  return validPatterns.some(pattern => pattern.test(gitUrl))
}

/**
 * Get owner and repo from GitHub URL
 * @param gitUrl GitHub repository URL
 * @returns Object with owner and repo
 */
export function parseGitHubUrl(gitUrl: string): { owner: string; repo: string } | null {
  if (!gitUrl) return null
  
  const cleanUrl = gitUrl.replace(/\.git$/, '')
  
  const patterns = [
    /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/.*)?$/,
    /git@github\.com:([^\/]+)\/([^\/]+)(?:\.git)?$/
  ]
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern)
    if (match && match[1] && match[2]) {
      return {
        owner: match[1],
        repo: match[2]
      }
    }
  }
  
  return null
}
