import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  saveData: (filename: string, data: string) =>
    ipcRenderer.invoke('save-data', filename, data),
  loadData: (filename: string) =>
    ipcRenderer.invoke('load-data', filename),
  listFiles: (pattern: string) =>
    ipcRenderer.invoke('list-files', pattern),
  deleteData: (filename: string) =>
    ipcRenderer.invoke('delete-data', filename),
  exportData: (defaultName: string, data: string) =>
    ipcRenderer.invoke('export-data', defaultName, data),
  importData: () =>
    ipcRenderer.invoke('import-data')
})

declare global {
  interface Window {
    api: {
      saveData: (filename: string, data: string) => Promise<{ success: boolean }>
      loadData: (filename: string) => Promise<string | null>
      listFiles: (pattern: string) => Promise<string[]>
      deleteData: (filename: string) => Promise<{ success: boolean }>
      exportData: (defaultName: string, data: string) => Promise<{ success: boolean; path?: string }>
      importData: () => Promise<{ success: boolean; data?: string; path?: string }>
    }
  }
}

export {}
