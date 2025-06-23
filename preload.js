const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronStore', {
  get: (key) => ipcRenderer.invoke('store-get', key),
  set: (key, value) => ipcRenderer.invoke('store-set', { key, value }),
});

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  sendUserActivity: () => ipcRenderer.send('user-activity'),
  sendUserActivity2: () => ipcRenderer.send('user-activity2'),
  cargarCanciones: () => ipcRenderer.invoke('cargar-canciones'),
  cargarPlaylists: () => ipcRenderer.invoke('cargar-playlists')
});