import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// بديل لـ electron-is-dev
const isDev = !app.isPackaged;

let mainWindow;

// إنشاء النافذة الرئيسية
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // تحميل التطبيق
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // في وضع الإنتاج، الملفات موجودة في نفس المجلد
    const indexPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  // معالجة إغلاق النافذة
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // إنشاء القائمة
  createMenu();
}

// إنشاء القائمة
function createMenu() {
  const template = [
    {
      label: 'ملف',
      submenu: [
        {
          label: 'خروج',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'تحرير',
      submenu: [
        { label: 'تراجع', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'إعادة', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'قص', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'نسخ', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'لصق', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'تكبير', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'تصغير', accelerator: 'CmdOrCtrl+Minus', role: 'zoomOut' },
        { label: 'إعادة تعيين', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'ملء الشاشة', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'حول التطبيق',
          click: () => {
            // يمكن إضافة نافذة حول هنا
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// عند جاهزية التطبيق
app.on('ready', createWindow);

// إغلاق التطبيق عند إغلاق جميع النوافذ (على Windows و Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// إعادة إنشاء النافذة عند تفعيل التطبيق (على macOS)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// معالجة IPC للاتصال بين العمليات
ipcMain.on('app-version', (event) => {
  event.reply('app-version', { version: app.getVersion() });
});

// معالجة أي أخطاء
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

