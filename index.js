import { BrowserWindow, app, screen, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Store from 'electron-store';

const store = new Store();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ipcMain.handle('cargar-canciones', () => {
    const ruta = path.join(__dirname, 'songs.json');
    const data = fs.readFileSync(ruta, 'utf-8');
    return JSON.parse(data);
});

ipcMain.handle('cargar-playlists', () => {
    const ruta = path.join(__dirname, 'playlists.json');
    const data = fs.readFileSync(ruta, 'utf-8');
    return JSON.parse(data);
});

let overlayWin, playlistWin;
let inactivityTimeout, inactivityTimeout2;

const INACTIVITY_TIME = 5000;

const resetInactivityTimeout = () => {
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
        if (overlayWin && overlayWin.isVisible()) {
            fadeOut(overlayWin);
        }
    }, INACTIVITY_TIME);
};

const resetInactivityTimeout2 = () => {
    if (inactivityTimeout2) clearTimeout(inactivityTimeout2);
    inactivityTimeout2 = setTimeout(() => {
        if (playlistWin && playlistWin.isVisible()) {
            fadeOut(playlistWin);
        }
    }, INACTIVITY_TIME);
};

const FADE_INTERVAL = 20; // ms entre pasos
const FADE_STEP = 0.05;   // cuánto cambia la opacidad cada paso

function fadeIn(win) {
    win.setOpacity(0);
    win.show();
    win.focus();
    let opacity = 0;
    const fadeInInterval = setInterval(() => {
        opacity += FADE_STEP;
        if (opacity >= 1) {
            opacity = 1;
            clearInterval(fadeInInterval);
        }
        win.setOpacity(opacity);
    }, FADE_INTERVAL);
}

function fadeOut(win) {
    let opacity = win.getOpacity();
    const fadeOutInterval = setInterval(() => {
        opacity -= FADE_STEP;
        if (opacity <= 0) {
            opacity = 0;
            clearInterval(fadeOutInterval);
            win.hide();
        }
        win.setOpacity(opacity);
    }, FADE_INTERVAL);
}

const createWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const marginRight = Math.floor(width * 0.025);
    const marginTop = Math.floor(width * 0.025);

    let ancho = Math.floor(width * 0.15);
    let alto = Math.floor(width * 0.5);

    overlayWin = new BrowserWindow({
        width: ancho,
        height: alto,
        x: width - ancho - marginRight,
        y: marginTop,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        hasShadow: false,
        resizable: false,
        skipTaskbar: true,
        focusable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    overlayWin.loadFile("index.html");

    // Forzar foco si pierde foco (para que no desaparezca)
    overlayWin.on('blur', () => {
        if (overlayWin && overlayWin.isVisible()) {
            overlayWin.focus();
        }
    });

    playlistWin = new BrowserWindow({
        width: ancho * 1.5,
        height: width * 0.2,
        x: marginRight,
        y: marginTop,
        frame: false,
        transparent: true,
        hasShadow: false,
        resizable: false,
        skipTaskbar: true,
        focusable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });
    playlistWin.loadFile('playlist.html');

    playlistWin.on('blur', () => {
        if (playlistWin && playlistWin.isVisible()) {
            playlistWin.focus();
        }
    });
};

app.whenReady().then(() => {
    createWindow();

    globalShortcut.register('Control+Shift+Alt+P', () => {
        if (overlayWin) {
            if (overlayWin.isVisible()) {
                fadeOut(overlayWin);
            } else {
                fadeIn(overlayWin);
                resetInactivityTimeout();
            }
        }
    });

    // Recibir mensaje de actividad desde renderer
    ipcMain.on('user-activity', () => {
        resetInactivityTimeout();
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    globalShortcut.register('Control+Shift+Alt+M', () => {
        if (playlistWin) {
            if (playlistWin.isVisible()) {
                fadeOut(playlistWin);
            } else {
                fadeIn(playlistWin);
                resetInactivityTimeout2();
            }
        }
    });

    // Recibir mensaje de actividad desde renderer
    ipcMain.on('user-activity2', () => {
        resetInactivityTimeout2();
    });

    app.on('will-quit2', () => {
        globalShortcut.unregisterAll();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('fade-in', () => {
    if (overlayWin) fadeIn(overlayWin);
});

ipcMain.handle('fade-out', () => {
    if (overlayWin) fadeOut(overlayWin);
});

ipcMain.handle('store-get', (event, key) => {
    return store.get(key);
});

ipcMain.handle('store-set', (event, { key, value }) => {
    store.set(key, value);
    return true;
});

ipcMain.on('cargar-cancion', (event, index) => {
    if (overlayWin && overlayWin.webContents) {
        overlayWin.webContents.send('cargar-cancion', index);
    }
});

ipcMain.on('reproducir-cancion', (event, index) => {
    if (overlayWin) {
        overlayWin.webContents.send('reproducir-cancion', index);
    }
});

ipcMain.on('pausar-cancion', (event) => {
    if (overlayWin) {
        overlayWin.webContents.send('pausar-cancion');
    }
});