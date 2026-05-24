/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
//import MenuBuilder from './menu';
import {
  resolveHtmlPath,
  validateSelectedPath,
  validateDirectoryExists,
  getJsonFiles,
} from './util';
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';

// ─── パス解決 ──────────────────────────────────────
/*
 * __dirname の値が実行環境によって異なるため、
 * まずプロジェクトルート（viewer/）を確定し、
 * そこから全てのパスを解決する。
 *
 * 環境ごとの __dirname:
 *   npm run start  → viewer/src/main/
 *   npm run build  → viewer/release/app/dist/main/
 *   パッケージ後    → app.isPackaged === true
 *
 */

function getProjectRoot(): string {
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'));
  }
  const isBuilt = __dirname.includes(path.join('release', 'app', 'dist'));
  return isBuilt
    ? path.resolve(__dirname, '..', '..', '..', '..') // 4階層上
    : path.resolve(__dirname, '..', '..'); // 2階層上
}

const PROJECT_ROOT = getProjectRoot();

function getPreloadPath(): string {
  const isBuilt = __dirname.includes(path.join('release', 'app', 'dist'));
  if (app.isPackaged || isBuilt) {
    return path.resolve(__dirname, 'preload.js'); // ビルド時
  }
  return path.resolve(PROJECT_ROOT, '.erb', 'dll', 'preload.js'); // 開発時
}

function getResourcesPath(): string {
  if (app.isPackaged) {
    return path.resolve(process.resourcesPath, 'assets'); // ビルド時
  }
  return path.resolve(PROJECT_ROOT, 'assets'); // 開発時
}

// ─── ログフォルダのパス解決 ──────────────────────────────────────
/*
 * 1. 環境変数LOGS_PATHが設定されているか
 * 2. 保存されたパスが存在するか
 * 3. ダイアログからパスを指定する
 */
const LOGS_PATH_FILE_NAME = 'logs-path.txt';

const logsPathStore = {
  filePath: path.join(app.getPath('userData'), LOGS_PATH_FILE_NAME),
  load(): string | null {
    try {
      const saved = fs.readFileSync(this.filePath, 'utf8').trim();
      return fs.existsSync(saved) ? saved : null;
    } catch {
      return null;
    }
  },

  save(logsPath: string): void {
    fs.writeFileSync(this.filePath, logsPath, 'utf8');
  },

  resolve(): string | null {
    return process.env.LOGS_PATH ?? this.load();
  },
};

// ─── アップデーター ────────────────────────────────
class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

// ─── メインウィンドウ ──────────────────────────────

let mainWindow: BrowserWindow | null = null;

// ipcMain.on('ipc-example', async (event, arg) => {
//   const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
//   console.log(msgTemplate(arg));
//   event.reply('ipc-example', msgTemplate('pong'));
// });

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = getResourcesPath();
  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      devTools: false,
      nodeIntegration: false, // レンダラーから Node.js を直接使わせない
      contextIsolation: true, // レンダラーと preload の実行コンテキストを分離
      preload: getPreloadPath(),
    },
    autoHideMenuBar: true,
  });
  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

// ─── Express サーバー ──────────────────────────────

var http = express();
http.use(bodyParser.json({ limit: '50mb' }));

http.post('/api/blocksview', (req: any, res: any) => {
  const receivedData = req.body;
  if (mainWindow) {
    //受け取ったJsonボディーをレンダラーへ通知
    mainWindow.webContents.send('view-message', req.body);
    res.status(200).json({ message: 'successfully' });
  } else {
    res.status(200).json({ message: 'error view not started' });
  }
});

http.post('/api/blocksview/result', (req: any, res: any) => {
  const receivedData = req.body;
  if (mainWindow) {
    //受け取ったJsonボディーをレンダラーへ通知
    mainWindow.webContents.send('result-message', req.body);
    res.status(200).json({ message: 'successfully' });
  } else {
    res.status(200).json({ message: 'error view not started' });
  }
});

// Expressサーバーをポート8000で起動
const server = http.listen(8000, () => {
  console.log('listen started port:8000');
});

// ─── アプリ ライフサイクル ─────────────────────────

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

// ─── IPC handlers ────────────────────────────────

// 1. モードを取得する
ipcMain.handle('get-app-mode', () => {
  // ─── 起動モードを判定 ────────────────────────────
  // 優先順位: 環境変数 > 選択画面
  if (process.env.VIEWER_MODE === 'replay') return 'replay';
  if (process.env.VIEWER_MODE === 'live') return 'live';
  return 'select'; // 指定なし → 選択画面
});

// 2. 保存済みのログフォルダパスを返す（未設定の場合は null）
ipcMain.handle('resolve-logs-path', (): string | null => {
  return logsPathStore.resolve();
});

// 3. ダイアログを開いてログフォルダを選択・保存してパスを返す
ipcMain.handle('select-logs-folder', async (): Promise<string> => {
  if (!mainWindow) throw new Error('mainWindow is not defined');

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'ログフォルダを選択してください',
    properties: ['openDirectory'],
  });

  const selectedPath = validateSelectedPath(result);
  validateDirectoryExists(selectedPath);

  logsPathStore.save(selectedPath);
  return selectedPath;
});

// 4. 指定されたパスのJSONファイル一覧を返す
ipcMain.handle(
  'get-match-list',
  async (_event, logsPath: string): Promise<string[]> => {
    validateDirectoryExists(logsPath);

    const jsonFiles = getJsonFiles(logsPath);
    if (jsonFiles.length === 0) {
      throw new Error(`ログファイルが見つかりません: ${logsPath}`);
    }

    return jsonFiles;
  },
);

// 5. 指定されたログの中身を返す
ipcMain.handle(
  'read-log-file',
  async (_event, logsPath: string, fileName: string) => {
    if (!logsPath) {
      throw new Error('ログフォルダが設定されていません。');
    }

    const filePath = path.join(logsPath, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`ログファイルが見つかりません: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  },
);
