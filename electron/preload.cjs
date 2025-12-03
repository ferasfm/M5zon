const { contextBridge, ipcRenderer } = require('electron');

// عرض APIs آمنة للتطبيق
contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    },
    database: {
        connect: (config) => ipcRenderer.invoke('db-connect', config),
        query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
        disconnect: () => ipcRenderer.invoke('db-disconnect'),
        isConnected: () => ipcRenderer.invoke('db-is-connected')
    }
});
