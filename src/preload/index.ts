import { contextBridge, ipcRenderer } from 'electron'

if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in the BrowserWindow')
}

try {
  contextBridge.exposeInMainWorld('api', {
    auth: {
      isFirstRun: () => ipcRenderer.invoke('auth:isFirstRun'),
      setupMaster: (data: any) => ipcRenderer.invoke('auth:setupMaster', data),
      login: (data: any) => ipcRenderer.invoke('auth:login', data),
      logout: (sessionId: string) => ipcRenderer.invoke('auth:logout', sessionId),
      validateSession: (sessionId: string) => ipcRenderer.invoke('auth:validateSession', sessionId),
      verifyMasterPassword: (password: string) => ipcRenderer.invoke('auth:verifyMasterPassword', password),
      getUsers: () => ipcRenderer.invoke('auth:getUsers'),
      createUser: (data: any) => ipcRenderer.invoke('auth:createUser', data),
      toggleUser: (data: any) => ipcRenderer.invoke('auth:toggleUser', data),
      changePassword: (data: any) => ipcRenderer.invoke('auth:changePassword', data)
    },
    projects: {
      getAll: () => ipcRenderer.invoke('projects:getAll'),
      getById: (id: string) => ipcRenderer.invoke('projects:getById', id),
      create: (data: any) => ipcRenderer.invoke('projects:create', data),
      update: (data: any) => ipcRenderer.invoke('projects:update', data),
      delete: (data: any) => ipcRenderer.invoke('projects:delete', data),
      selectLogo: () => ipcRenderer.invoke('projects:selectLogo')
    },
    plots: {
      getByProject: (projectId: string) => ipcRenderer.invoke('plots:getByProject', projectId),
      getById: (id: string) => ipcRenderer.invoke('plots:getById', id),
      create: (data: any) => ipcRenderer.invoke('plots:create', data),
      update: (data: any) => ipcRenderer.invoke('plots:update', data),
      delete: (data: any) => ipcRenderer.invoke('plots:delete', data)
    },
    buyers: {
      getAll: () => ipcRenderer.invoke('buyers:getAll'),
      getById: (id: string) => ipcRenderer.invoke('buyers:getById', id),
      create: (data: any) => ipcRenderer.invoke('buyers:create', data),
      update: (data: any) => ipcRenderer.invoke('buyers:update', data),
      selectAttachment: (kind: 'photo' | 'id') => ipcRenderer.invoke('buyers:selectAttachment', kind)
    },
    ownership: {
      getByPlot: (plotId: string) => ipcRenderer.invoke('ownership:getByPlot', plotId),
      getByBuyer: (buyerId: string) => ipcRenderer.invoke('ownership:getByBuyer', buyerId),
      transfer: (data: any) => ipcRenderer.invoke('ownership:transfer', data)
    },
    documents: {
      getByPlot: (plotId: string) => ipcRenderer.invoke('documents:getByPlot', plotId),
      openFilePicker: () => ipcRenderer.invoke('documents:openFilePicker'),
      upload: (data: any) => ipcRenderer.invoke('documents:upload', data),
      update: (data: any) => ipcRenderer.invoke('documents:update', data),
      getContent: (data: any) => ipcRenderer.invoke('documents:getContent', data),
      download: (data: any) => ipcRenderer.invoke('documents:download', data)
    },
    payments: {
      getByPlot: (plotId: string) => ipcRenderer.invoke('payments:getByPlot', plotId),
      create: (data: any) => ipcRenderer.invoke('payments:create', data)
    },
    backup: {
      list: () => ipcRenderer.invoke('backup:list'),
      create: (userId: string) => ipcRenderer.invoke('backup:create', userId),
      exportToUsb: (userId: string) => ipcRenderer.invoke('backup:exportToUsb', userId)
    },
    settings: {
      getAll: () => ipcRenderer.invoke('settings:getAll'),
      update: (data: any) => ipcRenderer.invoke('settings:update', data)
    },
    search: {
      global: (data: any) => ipcRenderer.invoke('search:global', data)
    },
    audit: {
      getLogs: (options: any) => ipcRenderer.invoke('audit:getLogs', options),
      getDashboardStats: () => ipcRenderer.invoke('audit:getDashboardStats'),
      verify: () => ipcRenderer.invoke('audit:verify')
    },
    window: {
      minimize: () => ipcRenderer.invoke('window:minimize'),
      maximize: () => ipcRenderer.invoke('window:maximize'),
      close: () => ipcRenderer.invoke('window:close'),
      isMaximized: () => ipcRenderer.invoke('window:isMaximized')
    }
  })
} catch (error) {
  console.error(error)
}
