const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pb', {
  getPrompts:    ()        => ipcRenderer.invoke('get-prompts'),
  getTags:       ()        => ipcRenderer.invoke('get-tags'),
  createPrompt:  (data)    => ipcRenderer.invoke('create-prompt', data),
  updatePrompt:  (id, f)   => ipcRenderer.invoke('update-prompt', id, f),
  deletePrompt:  (id)      => ipcRenderer.invoke('delete-prompt', id),
  incrementUses: (id)      => ipcRenderer.invoke('increment-uses', id),
  copyText:      (text)    => ipcRenderer.invoke('copy-text', text),
})
