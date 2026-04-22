import { EventEmitter } from 'events'
import { appendLog } from './db'

export const bus = new EventEmitter()
bus.setMaxListeners(0)

/**
 * Persist a log line and broadcast it to any live SSE subscribers.
 */
export function emitLog(deploymentId: string, message: string): void {
  const line = message.trimEnd()
  if (!line) return
  
  // Only try to append to database if it's a real deployment ID
  // System logs (like 'system') don't have corresponding deployment records
  if (deploymentId && deploymentId !== 'system') {
    try {
      appendLog(deploymentId, line)
    } catch (error) {
      // Ignore foreign key errors for system logs
      if ((error as any).code !== 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        console.error('Error appending log:', error)
      }
    }
  }
  
  bus.emit(`log:${deploymentId}`, line)
}

/**
 * Broadcast a status change.
 */
export function emitStatus(deploymentId: string, status: string): void {
  bus.emit(`status:${deploymentId}`, status)
}
