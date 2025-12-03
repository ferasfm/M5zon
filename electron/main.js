import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import { createRequire } from 'module';
import db from './database.js';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'نظام إدارة المخزون الاحترافي',
    backgroundColor: '#ffffff',
    show: false
  });

  // تحميل التطبيق
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // إظهار النافذة عند الجاهزية بحجم كامل الشاشة
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Database IPC Handlers
ipcMain.handle('db-connect', async (event, config) => {
  return await db.connect(config);
});

ipcMain.handle('db-query', async (event, sql, params) => {
  return await db.query(sql, params);
});

ipcMain.handle('db-disconnect', async () => {
  return await db.disconnect();
});

ipcMain.handle('db-is-connected', () => {
  return db.isConnected();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  db.disconnect(); // Ensure DB is disconnected on exit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
