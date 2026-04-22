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
  appendLog(deploymentId, line)
  bus.emit(`log:${deploymentId}`, line)
}

/**
 * Broadcast a status change.
 */
export function emitStatus(deploymentId: string, status: string): void {
  bus.emit(`status:${deploymentId}`, status)
}
