import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/')({ component: Home })

interface Deployment {
  id: string
  git_url?: string
  project_name?: string
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed'
  image_tag?: string
  live_url?: string
  container_id?: string
  created_at: string
  updated_at: string
}

async function fetchDeployments(): Promise<Array<Deployment>> {
  const r = await fetch('/api/deployments')
  if (!r.ok) throw new Error('Failed to fetch deployments')
  return r.json()
}

async function createDeployment(data: {
  gitUrl?: string
  projectName?: string
}) {
  const r = await fetch('/api/deployments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed to create deployment')
  return r.json()
}

function DeployForm() {
  const [gitUrl, setGitUrl] = useState('')
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: createDeployment,
    onSuccess: () => {
      setGitUrl('')
      qc.invalidateQueries({ queryKey: ['deployments'] })
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (gitUrl) mutation.mutate({ gitUrl })
      }}
      className="flex gap-2"
    >
      <input
        type="url"
        value={gitUrl}
        onChange={(e) => setGitUrl(e.target.value)}
        placeholder="https://github.com/user/repo.git"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={mutation.isPending || !gitUrl}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? 'Creating...' : 'Deploy'}
      </button>
    </form>
  )
}

function DeploymentLogs({ id }: { id: string }) {
  const [logs, setLogs] = useState<Array<string>>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const es = new EventSource(`/api/deployments/${id}/logs`)
    es.onmessage = (e) => setLogs((prev) => [...prev.slice(-100), e.data])
    es.onerror = () => es.close()
    return () => es.close()
  }, [id, open])

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-blue-600 hover:text-blue-800"
      >
        {open ? 'Hide' : 'Show'} Logs
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-gray-900 text-green-400 text-xs rounded max-h-48 overflow-auto whitespace-pre-wrap">
          {logs.length ? logs.join('\n') : 'Waiting for logs...'}
        </pre>
      )}
    </div>
  )
}

const statusClasses: Record<string, string> = {
  running: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  building: 'bg-yellow-100 text-yellow-800',
  deploying: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-800',
}

function DeploymentList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['deployments'],
    queryFn: fetchDeployments,
    refetchInterval: 3000,
  })

  if (isLoading) return <div>Loading...</div>
  if (error)
    return <div className="text-red-600">{(error as Error).message}</div>
  if (!data?.length)
    return <div className="text-gray-500">No deployments yet</div>

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div
          key={d.id}
          className="border border-gray-200 rounded-md p-3 bg-white"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold">
                {d.git_url?.split('/').pop()?.replace('.git', '') ||
                  d.project_name}
              </div>
              <div className="text-xs text-gray-500">{d.git_url}</div>
              {d.image_tag && (
                <div className="text-xs text-gray-400">{d.image_tag}</div>
              )}
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${statusClasses[d.status] ?? 'bg-gray-100'}`}
            >
              {d.status}
            </span>
          </div>
          {d.live_url && (
            <a
              href={d.live_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              View Live →
            </a>
          )}
          <DeploymentLogs id={d.id} />
        </div>
      ))}
    </div>
  )
}

function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold">Brimble Deploy</h1>
          <div className="text-sm text-gray-500">
            One-page deployment pipeline
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8 grid gap-8">
        <section>
          <h2 className="text-base font-medium mb-3">Create New Deployment</h2>
          <DeployForm />
        </section>
        <section>
          <h2 className="text-base font-medium mb-3">Deployments</h2>
          <DeploymentList />
        </section>
      </main>
    </div>
  )
}
