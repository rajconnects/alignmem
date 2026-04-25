import type { IndexedTrace, ProjectEntry, ApiResponse } from './types'

// Thin fetch client for the local Express API. All requests run
// against same-origin (/api) with credentials so the signed cookie
// is carried automatically.

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Request failed (${res.status})`)
  }
  return json.data as T
}

export interface AuthStatus {
  authed: boolean
  firstRun: boolean
}

export const api = {
  authStatus: (): Promise<AuthStatus> => req('/api/auth/status'),
  login: (passcode: string): Promise<AuthStatus> =>
    req('/api/auth/login', { method: 'POST', body: JSON.stringify({ passcode }) }),
  setup: (passcode: string): Promise<AuthStatus> =>
    req('/api/auth/setup', { method: 'POST', body: JSON.stringify({ passcode }) }),
  logout: (): Promise<AuthStatus> => req('/api/auth/logout', { method: 'POST' }),

  listProjects: (): Promise<ProjectEntry[]> => req('/api/projects'),
  addProject: (path: string): Promise<{ project: ProjectEntry; projects: ProjectEntry[] }> =>
    req('/api/projects', { method: 'POST', body: JSON.stringify({ path }) }),

  listTraces: (
    projectName: string
  ): Promise<{ traces: IndexedTrace[]; errors: Array<{ file: string; message: string }>; project: ProjectEntry }> =>
    req(`/api/traces?project=${encodeURIComponent(projectName)}`),

  reveal: (projectName: string, id: string): Promise<{ revealed: string }> =>
    req(`/api/reveal?project=${encodeURIComponent(projectName)}&id=${encodeURIComponent(id)}`, {
      method: 'POST'
    })
}

export function traceEventSource(projectName: string): EventSource {
  return new EventSource(`/api/events?project=${encodeURIComponent(projectName)}`, {
    withCredentials: true
  })
}
