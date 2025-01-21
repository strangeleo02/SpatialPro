const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  separateStems: (filePath) => ipcRenderer.invoke('separate-stems', filePath),
});