// Ponte entre a janela e o Electron: a página só enxerga isto (window.trucado).

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trucado', {
  /** A pasta de músicas e as faixas que tem nela. */
  listarMusicas: () => ipcRenderer.invoke('musica:listar'),
  /** Abre a pasta de músicas no Explorador. */
  abrirPastaMusicas: () => ipcRenderer.invoke('musica:abrir-pasta'),
});
