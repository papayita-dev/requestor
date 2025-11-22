import { ElectronAPI } from '@electron-toolkit/preload'

interface CustomAPI {
  sendHttpRequest: (requestData: {
    url: string
    method: string
    headers: Record<string, string>
    body?: string
  }) => Promise<{
    ok: boolean
    status: number
    statusText: string
    data?: any
    error?: string
  }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
    electronAPI: CustomAPI
  }
}
