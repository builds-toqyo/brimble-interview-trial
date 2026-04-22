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
