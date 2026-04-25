const DEFAULT_API_BASE = 'https://dashboard.claw.lkohl.duckdns.org/api'

const apiFromBase = process.env.NEXT_PUBLIC_API_BASE
const apiFromUrl = process.env.NEXT_PUBLIC_API_URL

export const API_BASE = (apiFromBase || apiFromUrl || DEFAULT_API_BASE).replace(/\/$/, '')
export const API_ORIGIN = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE
export const APP_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/healthhub'

export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

export function appPath(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (!APP_BASE_PATH || APP_BASE_PATH === '/') return normalized
  return `${APP_BASE_PATH}${normalized}`
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}
