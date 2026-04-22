import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'running'
  | 'failed'
  | 'stopping'
  | 'stopped'

export interface Deployment {
  id: string
  git_url: string | null
  project_name: string | null
  status: DeploymentStatus
  current_version: number | null
  container_id: string | null
  host_port: number | null
  live_url: string | null
  created_at: string
  updated_at: string
}

export interface DeploymentVersion {
  id: number
  deployment_id: string
  version: number
  image_tag: string
  git_commit: string | null
  status: DeploymentStatus
  container_id: string | null
  host_port: number | null
  created_at: string
  updated_at: string
}

export interface ScheduledRollback {
  id: number
  deployment_id: string
  target_version: number
  scheduled_at: string
  executed_at: string | null
  status: 'pending' | 'executed' | 'failed'
  reason: string | null
  created_at: string
}

export interface TrafficSplit {
  id: number
  deployment_id: string
  version_a: number
  version_b: number
  weight_a: number
  weight_b: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Region {
  id: number
  name: string
  endpoint: string
  region_code: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface DeploymentRegion {
  id: number
  deployment_id: string
  region_id: number
  version: number
  status: 'active' | 'inactive'
  endpoint_url: string
  created_at: string
}

export interface HealthCheck {
  id: number
  deployment_id: string
  version: number
  endpoint_path: string
  method: 'GET' | 'POST'
  expected_status: number
  timeout_ms: number
  interval_ms: number
  status: 'healthy' | 'unhealthy' | 'unknown'
  last_check: string | null
  created_at: string
}

const DATA_DIR = process.env.DATA_DIR || path.resolve('./data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(path.join(DATA_DIR, 'deployments.db'))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS deployments (
    id            TEXT PRIMARY KEY,
    git_url       TEXT,
    project_name  TEXT,
    status        TEXT NOT NULL DEFAULT 'pending',
    current_version INTEGER,
    container_id  TEXT,
    host_port     INTEGER,
    live_url      TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deployment_versions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id  TEXT NOT NULL,
    version        INTEGER NOT NULL,
    image_tag      TEXT NOT NULL,
    git_commit     TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',
    container_id   TEXT,
    host_port      INTEGER,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (deployment_id) REFERENCES deployments(id),
    UNIQUE(deployment_id, version)
  );

  CREATE TABLE IF NOT EXISTS deployment_logs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id  TEXT NOT NULL,
    message        TEXT NOT NULL,
    ts             TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (deployment_id) REFERENCES deployments(id)
  );

  CREATE INDEX IF NOT EXISTS idx_logs_deployment ON deployment_logs(deployment_id, id);
  CREATE INDEX IF NOT EXISTS idx_versions_deployment ON deployment_versions(deployment_id, version);

  CREATE TABLE IF NOT EXISTS scheduled_rollbacks (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id  TEXT NOT NULL,
    target_version INTEGER NOT NULL,
    scheduled_at   TEXT NOT NULL,
    executed_at    TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',
    reason         TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (deployment_id) REFERENCES deployments(id)
  );

  CREATE TABLE IF NOT EXISTS traffic_splits (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id  TEXT NOT NULL,
    version_a      INTEGER NOT NULL,
    version_b      INTEGER NOT NULL,
    weight_a       INTEGER NOT NULL DEFAULT 50,
    weight_b       INTEGER NOT NULL DEFAULT 50,
    status         TEXT NOT NULL DEFAULT 'inactive',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (deployment_id) REFERENCES deployments(id),
    CHECK (weight_a >= 0 AND weight_a <= 100),
    CHECK (weight_b >= 0 AND weight_b <= 100),
    CHECK (weight_a + weight_b = 100)
  );

  CREATE TABLE IF NOT EXISTS regions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL UNIQUE,
    endpoint       TEXT NOT NULL,
    region_code    TEXT NOT NULL UNIQUE,
    status         TEXT NOT NULL DEFAULT 'active',
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deployment_regions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id  TEXT NOT NULL,
    region_id      INTEGER NOT NULL,
    version        INTEGER NOT NULL,
    status         TEXT NOT NULL DEFAULT 'inactive',
    endpoint_url   TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (deployment_id) REFERENCES deployments(id),
    FOREIGN KEY (region_id) REFERENCES regions(id)
  );

  CREATE TABLE IF NOT EXISTS health_checks (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id  TEXT NOT NULL,
    version        INTEGER NOT NULL,
    endpoint_path  TEXT NOT NULL DEFAULT '/health',
    method         TEXT NOT NULL DEFAULT 'GET',
    expected_status INTEGER NOT NULL DEFAULT 200,
    timeout_ms     INTEGER NOT NULL DEFAULT 5000,
    interval_ms    INTEGER NOT NULL DEFAULT 30000,
    status         TEXT NOT NULL DEFAULT 'unknown',
    last_check     TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (deployment_id) REFERENCES deployments(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scheduled_rollbacks_deployment ON scheduled_rollbacks(deployment_id, status);
  CREATE INDEX IF NOT EXISTS idx_traffic_splits_deployment ON traffic_splits(deployment_id, status);
  CREATE INDEX IF NOT EXISTS idx_deployment_regions_deployment ON deployment_regions(deployment_id, status);
  CREATE INDEX IF NOT EXISTS idx_health_checks_deployment ON health_checks(deployment_id, status);
`)

// Add host_port column if it doesn't exist (for existing databases)
try {
  db.exec('ALTER TABLE deployments ADD COLUMN host_port INTEGER')
} catch (err: any) {
  // Column already exists, ignore error
  if (!err.message.includes('duplicate column name')) {
    throw err
  }
}

// Add current_version column if it doesn't exist (for existing databases)
try {
  db.exec('ALTER TABLE deployments ADD COLUMN current_version INTEGER')
} catch (err: any) {
  // Column already exists, ignore error
  if (!err.message.includes('duplicate column name')) {
    throw err
  }
}

export function insertDeployment(row: {
  id: string
  git_url: string | null
  project_name: string | null
}): void {
  db.prepare(
    `INSERT INTO deployments (id, git_url, project_name, status)
     VALUES (@id, @git_url, @project_name, 'pending')`,
  ).run(row)
}

export function listDeployments(): Deployment[] {
  return db
    .prepare(`SELECT * FROM deployments ORDER BY created_at DESC`)
    .all() as Deployment[]
}

export function getDeployment(id: string): Deployment | undefined {
  return db
    .prepare(`SELECT * FROM deployments WHERE id = ?`)
    .get(id) as Deployment | undefined
}

export function updateDeployment(
  id: string,
  patch: Partial<
    Pick<
      Deployment,
      'status' | 'current_version' | 'container_id' | 'host_port' | 'live_url'
    >
  >,
): void {
  const fields: string[] = []
  const values: Record<string, unknown> = { id }
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = @${k}`)
    values[k] = v
  }
  fields.push(`updated_at = datetime('now')`)
  db.prepare(
    `UPDATE deployments SET ${fields.join(', ')} WHERE id = @id`,
  ).run(values)
}

export function appendLog(deploymentId: string, message: string): void {
  db.prepare(
    `INSERT INTO deployment_logs (deployment_id, message) VALUES (?, ?)`,
  ).run(deploymentId, message)
}

export function getLogs(deploymentId: string): string[] {
  return (
    db
      .prepare(
        `SELECT message FROM deployment_logs WHERE deployment_id = ? ORDER BY id`,
      )
      .all(deploymentId) as { message: string }[]
  ).map((r) => r.message)
}

// Version management functions
export function createDeploymentVersion(
  deploymentId: string,
  version: number,
  imageTag: string,
  gitCommit: string | null = null,
): void {
  db.prepare(
    `INSERT INTO deployment_versions (deployment_id, version, image_tag, git_commit, status)
     VALUES (?, ?, ?, ?, 'pending')`,
  ).run(deploymentId, version, imageTag, gitCommit)
}

export function updateDeploymentVersion(
  deploymentId: string,
  version: number,
  patch: Partial<
    Pick<
      DeploymentVersion,
      'status' | 'container_id' | 'host_port' | 'git_commit'
    >
  >,
): void {
  const fields: string[] = []
  const values: Record<string, unknown> = { deployment_id: deploymentId, version }
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = @${k}`)
    values[k] = v
  }
  fields.push(`updated_at = datetime('now')`)
  db.prepare(
    `UPDATE deployment_versions SET ${fields.join(', ')} WHERE deployment_id = @deployment_id AND version = @version`,
  ).run(values)
}

export function getDeploymentVersions(deploymentId: string): DeploymentVersion[] {
  return db
    .prepare(`SELECT * FROM deployment_versions WHERE deployment_id = ? ORDER BY version DESC`)
    .all(deploymentId) as DeploymentVersion[]
}

export function getDeploymentVersion(
  deploymentId: string,
  version: number,
): DeploymentVersion | undefined {
  return db
    .prepare(`SELECT * FROM deployment_versions WHERE deployment_id = ? AND version = ?`)
    .get(deploymentId, version) as DeploymentVersion | undefined
}

export function getCurrentVersion(deploymentId: string): DeploymentVersion | undefined {
  const deployment = getDeployment(deploymentId)
  if (!deployment || deployment.current_version === null) return undefined
  return getDeploymentVersion(deploymentId, deployment.current_version)
}

export function getPreviousVersion(deploymentId: string): DeploymentVersion | undefined {
  const current = getCurrentVersion(deploymentId)
  if (!current) return undefined
  
  return db
    .prepare(`SELECT * FROM deployment_versions WHERE deployment_id = ? AND version < ? ORDER BY version DESC LIMIT 1`)
    .get(deploymentId, current.version) as DeploymentVersion | undefined
}

export function setCurrentVersion(deploymentId: string, version: number): void {
  updateDeployment(deploymentId, { current_version: version })
}

// Scheduled Rollback functions
export function createScheduledRollback(
  deploymentId: string,
  targetVersion: number,
  scheduledAt: string,
  reason?: string,
): number {
  const result = db.prepare(
    `INSERT INTO scheduled_rollbacks (deployment_id, target_version, scheduled_at, reason)
     VALUES (?, ?, ?, ?)`,
  ).run(deploymentId, targetVersion, scheduledAt, reason || null)
  return result.lastInsertRowid as number
}

export function getScheduledRollbacks(deploymentId?: string): ScheduledRollback[] {
  if (deploymentId) {
    return db
      .prepare(`SELECT * FROM scheduled_rollbacks WHERE deployment_id = ? ORDER BY scheduled_at ASC`)
      .all(deploymentId) as ScheduledRollback[]
  }
  return db
    .prepare(`SELECT * FROM scheduled_rollbacks ORDER BY scheduled_at ASC`)
    .all() as ScheduledRollback[]
}

export function getPendingScheduledRollbacks(): ScheduledRollback[] {
  return db
    .prepare(`SELECT * FROM scheduled_rollbacks WHERE status = 'pending' AND scheduled_at <= datetime('now')`)
    .all() as ScheduledRollback[]
}

export function updateScheduledRollback(id: number, status: 'executed' | 'failed', executedAt?: string): void {
  db.prepare(
    `UPDATE scheduled_rollbacks SET status = ?, executed_at = ? WHERE id = ?`,
  ).run(status, executedAt || new Date().toISOString(), id)
}

// Traffic Split functions
export function createTrafficSplit(
  deploymentId: string,
  versionA: number,
  versionB: number,
  weightA: number = 50,
  weightB: number = 50,
): number {
  const result = db.prepare(
    `INSERT INTO traffic_splits (deployment_id, version_a, version_b, weight_a, weight_b)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(deploymentId, versionA, versionB, weightA, weightB)
  return result.lastInsertRowid as number
}

export function getActiveTrafficSplit(deploymentId: string): TrafficSplit | undefined {
  return db
    .prepare(`SELECT * FROM traffic_splits WHERE deployment_id = ? AND status = 'active'`)
    .get(deploymentId) as TrafficSplit | undefined
}

export function updateTrafficSplit(id: number, status: 'active' | 'inactive', weights?: { weightA: number; weightB: number }): void {
  if (weights) {
    db.prepare(
      `UPDATE traffic_splits SET status = ?, weight_a = ?, weight_b = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(status, weights.weightA, weights.weightB, id)
  } else {
    db.prepare(
      `UPDATE traffic_splits SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(status, id)
  }
}

// Region functions
export function createRegion(name: string, endpoint: string, regionCode: string): number {
  const result = db.prepare(
    `INSERT INTO regions (name, endpoint, region_code) VALUES (?, ?, ?)`,
  ).run(name, endpoint, regionCode)
  return result.lastInsertRowid as number
}

export function getRegions(): Region[] {
  return db
    .prepare(`SELECT * FROM regions ORDER BY name`)
    .all() as Region[]
}

export function getActiveRegions(): Region[] {
  return db
    .prepare(`SELECT * FROM regions WHERE status = 'active' ORDER BY name`)
    .all() as Region[]
}

export function createDeploymentRegion(
  deploymentId: string,
  regionId: number,
  version: number,
  endpointUrl: string,
): number {
  const result = db.prepare(
    `INSERT INTO deployment_regions (deployment_id, region_id, version, endpoint_url)
     VALUES (?, ?, ?, ?)`,
  ).run(deploymentId, regionId, version, endpointUrl)
  return result.lastInsertRowid as number
}

export function getDeploymentRegions(deploymentId: string): DeploymentRegion[] {
  return db
    .prepare(`SELECT dr.*, r.name, r.region_code FROM deployment_regions dr 
              JOIN regions r ON dr.region_id = r.id 
              WHERE dr.deployment_id = ? ORDER BY r.name`)
    .all(deploymentId) as (DeploymentRegion & { name: string; region_code: string })[]
}

// Health Check functions
export function createHealthCheck(
  deploymentId: string,
  version: number,
  endpointPath: string = '/health',
  method: 'GET' | 'POST' = 'GET',
  expectedStatus: number = 200,
  timeoutMs: number = 5000,
  intervalMs: number = 30000,
): number {
  const result = db.prepare(
    `INSERT INTO health_checks (deployment_id, version, endpoint_path, method, expected_status, timeout_ms, interval_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(deploymentId, version, endpointPath, method, expectedStatus, timeoutMs, intervalMs)
  return result.lastInsertRowid as number
}

export function getHealthChecks(deploymentId: string): HealthCheck[] {
  return db
    .prepare(`SELECT * FROM health_checks WHERE deployment_id = ? ORDER BY created_at DESC`)
    .all(deploymentId) as HealthCheck[]
}

export function updateHealthCheck(id: number, status: 'healthy' | 'unhealthy' | 'unknown', lastCheck?: string): void {
  db.prepare(
    `UPDATE health_checks SET status = ?, last_check = ? WHERE id = ?`,
  ).run(status, lastCheck || new Date().toISOString(), id)
}

export function getPendingHealthChecks(): HealthCheck[] {
  const threshold = new Date(Date.now() - 60000).toISOString() // 1 minute ago
  return db
    .prepare(`SELECT * FROM health_checks WHERE last_check IS NULL OR last_check < ?`)
    .all(threshold) as HealthCheck[]
}
