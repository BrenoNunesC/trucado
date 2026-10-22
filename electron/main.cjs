// Processo principal do Electron: abre o jogo numa janela própria, sem navegador.
// O jogo é o build do Vite em dist/ (caminhos relativos), carregado do disco.
//
// Também cuida de duas coisas que a página não alcança sozinha:
//  - a pasta de músicas (Músicas\Trucado): lista as faixas e serve cada uma pelo endereço
//    musica://<arquivo>, sem deixar sair da pasta;
//  - o player de músicas do YouTube (precisa de uma origem para tocar);
//  - a atualização automática pelo GitHub Releases (só no instalador; a versão portátil não se
//    atualiza sozinha).

const { app, BrowserWindow, Menu, shell, protocol, net, ipcMain, dialog, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

/** Extensões de áudio que o Chromium toca. */
const AUDIO = new Set(['.mp3', '.ogg', '.oga', '.opus', '.m4a', '.aac', '.wav', '.flac', '.webm']);

/** Pasta das músicas do boteco: Músicas\Trucado (criada na primeira vez). */
function musicFolder() {
  const dir = path.join(app.getPath('music'), 'Trucado');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // sem permissão: a lista só vem vazia
  }
  return dir;
}

// o endereço musica:// precisa ser registrado antes do app ficar pronto
protocol.registerSchemesAsPrivileged([{ scheme: 'musica', privileges: { secure: true, standard: true, stream: true, supportFetchAPI: true } }]);
// a trilha pode começar sem precisar de um clique antes
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Trucado',
    backgroundColor: '#1c3a2a',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // F11 alterna tela cheia
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });

  // o jogo não navega para fora; qualquer link externo abre no navegador do sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  return win;
}

/** Atualização automática: baixa em segundo plano e pergunta antes de reiniciar. */
function setupUpdates(win) {
  if (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_DIR) return;
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch {
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1,
      title: 'Trucado',
      message: `A versão ${info.version} do Trucado foi baixada.`,
      detail: 'Reinicie para usar a versão nova (ou ela entra na próxima vez que você abrir o jogo).',
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', () => {
    // sem internet ou sem release publicada: segue jogando
  });
  autoUpdater.checkForUpdates().catch(() => {});
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  const dir = musicFolder();

  // musica://faixas/<arquivo> → o arquivo dentro da pasta (e só dentro dela). O nome vai no
  // caminho, não no host, porque o host vira minúsculas.
  protocol.handle('musica', (req) => {
    const name = decodeURIComponent(new URL(req.url).pathname.replace(/^\/+/, ''));
    const file = path.resolve(dir, name);
    if (!file.startsWith(path.resolve(dir) + path.sep) || !AUDIO.has(path.extname(file).toLowerCase())) {
      return new Response('não encontrado', { status: 404 });
    }
    return net.fetch(pathToFileURL(file).toString());
  });

  ipcMain.handle('musica:listar', async () => {
    try {
      const names = await fs.promises.readdir(dir);
      return { pasta: dir, faixas: names.filter((n) => AUDIO.has(path.extname(n).toLowerCase())).sort((a, b) => a.localeCompare(b, 'pt-BR')) };
    } catch {
      return { pasta: dir, faixas: [] };
    }
  });
  ipcMain.handle('musica:abrir-pasta', () => shell.openPath(dir));

  // músicas do YouTube: o player embutido recusa tocar numa página sem origem (o jogo abre de
  // file://), então os pedidos ao YouTube saem com a página do projeto como referência
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube.com/*', 'https://youtube.com/*', 'https://www.youtube-nocookie.com/*'] },
    (details, done) => {
      const headers = details.requestHeaders;
      if (!headers.Referer && !headers.referer) headers.Referer = 'https://github.com/BrenoNunesC/trucado';
      done({ requestHeaders: headers });
    },
  );

  const win = createWindow();
  setupUpdates(win);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
