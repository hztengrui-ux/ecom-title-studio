'use strict';

const { app, BrowserWindow, Menu, dialog, ipcMain, shell, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

const PRODUCT_NAME = '跨多多标题工坊';
const APP_ID = 'com.kuaduo.titleworkshop';
const DATA_DIR_NAME = 'KuaduoTitleWorkshop-data';
const LEGACY_DATA_DIR_NAME = 'TitleWorkshop-data';
const APP_DATA_FOLDER = 'KuaduoTitleWorkshop';
const LEGACY_APP_DATA_FOLDER = 'TitleWorkshop';
const isDev = !app.isPackaged || process.argv.includes('--dev');

app.setName(PRODUCT_NAME);
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
app.commandLine.appendSwitch('lang', 'zh-CN');
app.commandLine.appendSwitch('high-dpi-support', '1');

function ensureExportDir() {
  const dir = path.join(app.getPath('userData'), '导出');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function uniqueFilePath(target) {
  let candidate = target;
  const parsed = path.parse(target);
  let index = 2;
  while (true) {
    try {
      await fsp.access(candidate);
      candidate = path.join(parsed.dir, `${parsed.name}-${index}${parsed.ext}`);
      index += 1;
    } catch {
      return candidate;
    }
  }
}

async function writeFileSafe(target, data, encoding) {
  try {
    await fsp.writeFile(target, data, encoding);
    return { path: target, fallback: false };
  } catch (error) {
    if (!['EACCES', 'EPERM', 'EROFS', 'ENOENT'].includes(error?.code)) throw error;
    const fallbackDir = ensureExportDir();
    const fallbackPath = await uniqueFilePath(path.join(fallbackDir, path.basename(target)));
    await fsp.writeFile(fallbackPath, data, encoding);
    return { path: fallbackPath, fallback: true, originalError: error.message };
  }
}

function migrateLegacyData(target, legacy) {
  if (target === legacy || fs.existsSync(target) || !fs.existsSync(legacy)) return;
  try {
    fs.cpSync(legacy, target, { recursive: true, force: false, errorOnExist: false });
  } catch (error) {
    console.warn('[main] legacy data migration skipped', error?.message || error);
  }
}

function chooseDataDir() {
  const override =
    process.env.KUADUO_TITLE_WORKSHOP_USER_DATA ||
    process.env.TITLE_WORKSHOP_USER_DATA;
  if (override) return path.resolve(override);
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    const target = path.join(portableDir, DATA_DIR_NAME);
    migrateLegacyData(target, path.join(portableDir, LEGACY_DATA_DIR_NAME));
    return target;
  }
  if (app.isPackaged) {
    // 便携版：设置与结果跟随程序目录，复制整个文件夹即可带走。
    const baseDir = path.dirname(process.execPath);
    const target = path.join(baseDir, DATA_DIR_NAME);
    migrateLegacyData(target, path.join(baseDir, LEGACY_DATA_DIR_NAME));
    return target;
  }
  const target = path.join(app.getPath('appData'), APP_DATA_FOLDER);
  migrateLegacyData(target, path.join(app.getPath('appData'), LEGACY_APP_DATA_FOLDER));
  return target;
}

try {
  const dataDir = chooseDataDir();
  fs.mkdirSync(dataDir, { recursive: true });
  app.setPath('userData', dataDir);
} catch {
  try {
    const fallback = path.join(app.getPath('appData'), APP_DATA_FOLDER);
    migrateLegacyData(
      fallback,
      path.join(app.getPath('appData'), LEGACY_APP_DATA_FOLDER),
    );
    fs.mkdirSync(fallback, { recursive: true });
    app.setPath('userData', fallback);
  } catch {
    // 保持 Electron 默认 userData 路径
  }
}

let localServer = null;
let mainWindow = null;
let appUrl = '';
let publicDir = '';
let lastOutputPath = '';
let stateTimer = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(bootstrap).catch((error) => {
    dialog.showErrorBox('跨多多标题工坊启动失败', error?.message || String(error));
    app.quit();
  });
}

async function bootstrap() {
  const result = await startLocalServer();
  localServer = result.server;
  appUrl = result.url;
  publicDir = result.publicDir;
  registerIpc();
  buildMenu();
  createWindow();
}

async function startLocalServer() {
  const appRoot = path.join(__dirname, '..');
  const serverPath = path.join(appRoot, 'server.mjs');
  const resolvedPublic = path.join(appRoot, 'public');
  const module = await import(pathToFileURL(serverPath).href);
  // 固定 origin 是设置持久化的前提：localStorage 按 scheme + host + port 隔离。
  // 端口被占用时只做很小的顺延，正常单实例启动始终是同一个 origin。
  const preferredPort = Number(process.env.KUADUO_PORT) || 47821;
  let server = null;
  let lastError = null;
  for (let offset = 0; offset < 10; offset += 1) {
    const candidate = module.createHttpServer({ publicDir: resolvedPublic });
    try {
      await new Promise((resolve, reject) => {
        candidate.once('error', reject);
        candidate.listen(preferredPort + offset, '127.0.0.1', resolve);
      });
      server = candidate;
      break;
    } catch (error) {
      lastError = error;
      try { candidate.close(); } catch { /* already closed */ }
      if (error?.code !== 'EADDRINUSE') throw error;
    }
  }
  if (!server) {
    throw new Error(`本地端口 ${preferredPort}-${preferredPort + 9} 都被占用：${lastError?.message || ''}`);
  }
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('无法启动本地服务');
  return {
    server,
    publicDir: resolvedPublic,
    url: `http://127.0.0.1:${address.port}/`,
  };
}

function statePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  const fallback = { width: 1440, height: 1000 };
  try {
    const saved = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
    if (!saved || typeof saved !== 'object') return fallback;
    const width = Math.max(1100, Math.min(2400, Number(saved.width) || fallback.width));
    const height = Math.max(720, Math.min(1600, Number(saved.height) || fallback.height));
    const state = { width, height };
    if (Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))) {
      state.x = Math.round(Number(saved.x));
      state.y = Math.round(Number(saved.y));
    }
    return state;
  } catch {
    return fallback;
  }
}

function persistWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const bounds = mainWindow.getBounds();
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(
      statePath(),
      JSON.stringify({ width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y }),
      'utf8',
    );
  } catch {
    // 窗口状态只是便利功能，失败不影响使用
  }
}

function schedulePersist() {
  clearTimeout(stateTimer);
  stateTimer = setTimeout(persistWindowState, 350);
}

function createWindow() {
  const state = loadWindowState();
  const display = screen.getPrimaryDisplay().workArea;
  if (state.x !== undefined) {
    const visible =
      state.x < display.x + display.width - 120 &&
      state.x + state.width > display.x + 120 &&
      state.y < display.y + display.height - 80 &&
      state.y + state.height > display.y + 80;
    if (!visible) {
      delete state.x;
      delete state.y;
    }
  }

  mainWindow = new BrowserWindow({
    ...state,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: '#F4EFE5',
    title: PRODUCT_NAME,
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
      spellcheck: false,
    },
  });

  mainWindow.loadURL(appUrl).catch((error) => {
    dialog.showErrorBox('页面加载失败', error?.message || String(error));
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.setMenuBarVisibility(false);
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('resize', schedulePersist);
  mainWindow.on('move', schedulePersist);
  mainWindow.on('close', persistWindowState);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (appUrl && url.startsWith(appUrl)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'clipboard-sanitized-write');
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: PRODUCT_NAME,
        message: '界面进程意外退出',
        detail: `原因：${details.reason || 'unknown'}\n应用会重新加载界面。`,
        buttons: ['重新加载'],
      }).then(() => mainWindow?.reload());
    }
  });
}

function buildMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开输出文件夹',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: openLastOutput,
        },
        {
          label: '打开应用数据文件夹',
          click: () => shell.openPath(app.getPath('userData')),
        },
        { type: 'separator' },
        { label: '退出', accelerator: 'Alt+F4', role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' }, { label: '开发者工具', role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: `关于 ${PRODUCT_NAME}`, click: showAbout },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showAbout() {
  dialog.showMessageBox(mainWindow || undefined, {
    type: 'info',
    title: `关于 ${PRODUCT_NAME}`,
    message: `${PRODUCT_NAME} ${app.getVersion()}`,
    detail: [
      '电商标题识图生成 · 桌面版',
      '',
      '本地运行，不经过第三方中转。',
      '商品图仅发送到你配置的视觉模型服务。',
    ].join('\n'),
    buttons: ['好'],
    noLink: true,
  });
}

function openLastOutput() {
  if (lastOutputPath && fs.existsSync(lastOutputPath)) {
    shell.openPath(lastOutputPath);
    return;
  }
  dialog.showMessageBox(mainWindow || undefined, {
    type: 'info',
    title: '还没有输出',
    message: '还没有保存过批量结果',
    detail: '批量处理完成后，点「保存到文件夹」或「导出 Excel」，之后可以在这里快速打开。',
    buttons: ['好'],
    noLink: true,
  });
}

function safeName(value, fallback = 'output') {
  const name = String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  return name || fallback;
}

function safeFileName(value, fallback = 'image') {
  const name = path.basename(String(value || ''))
    .replace(/[<>:"/\\|?*\u0000-\u001f#%]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 110);
  return name || fallback;
}

function decodeBase64(value) {
  const raw = String(value || '').replace(/^data:[^;]+;base64,/i, '');
  if (!raw) return Buffer.alloc(0);
  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length > 60 * 1024 * 1024) throw new Error('文件超过 60MB 限制');
  return buffer;
}

async function uniqueDirectory(basePath) {
  let candidate = basePath;
  for (let index = 2; index < 100; index += 1) {
    try {
      await fsp.access(candidate);
      candidate = `${basePath}-${index}`;
    } catch {
      return candidate;
    }
  }
  return `${basePath}-${Date.now()}`;
}

function saveDialogOptions(title, defaultName, filters) {
  return {
    title,
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters,
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  };
}

function registerIpc() {
  ipcMain.handle('desktop:info', () => ({
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
  }));

  ipcMain.handle('desktop:select-directory', async (_event, payload = {}) => {
    const picked = await dialog.showOpenDialog(mainWindow || undefined, {
      title: payload.title || '选择文件夹',
      buttonLabel: '选择',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (picked.canceled || !picked.filePaths?.[0]) return { ok: false, canceled: true };
    return { ok: true, path: picked.filePaths[0] };
  });

  ipcMain.handle('desktop:save-text', async (_event, payload = {}) => {
    const extension = safeName(payload.extension || 'txt', 'txt').replace(/[^a-z0-9]/gi, '') || 'txt';
    const name = safeName(payload.defaultName || 'export', 'export').replace(/\.[a-z0-9]+$/i, '');
    const defaultPath = payload.outputDir
      ? path.join(payload.outputDir, `${name}.${extension}`)
      : path.join(ensureExportDir(), `${name}.${extension}`);
    const result = await dialog.showSaveDialog(
      mainWindow || undefined,
      {
        title: payload.title || '保存文件',
        defaultPath,
        filters: payload.filters || [{ name: `${extension.toUpperCase()} 文件`, extensions: [extension] }],
        properties: ['createDirectory', 'showOverwriteConfirmation'],
      },
    );
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    const written = await writeFileSafe(result.filePath, String(payload.content || ''), 'utf8');
    lastOutputPath = path.dirname(written.path);
    return { ok: true, path: written.path, fallback: written.fallback, originalError: written.originalError };
  });

  ipcMain.handle('desktop:save-excel', async (_event, payload = {}) => {
    const name = safeName(payload.defaultName || '跨多多标题工坊.xlsx', '跨多多标题工坊.xlsx')
      .replace(/\.xlsx$/i, '');
    const defaultPath = payload.outputDir
      ? path.join(payload.outputDir, `${name}.xlsx`)
      : path.join(ensureExportDir(), `${name}.xlsx`);
    const result = await dialog.showSaveDialog(
      mainWindow || undefined,
      {
        title: '导出 Excel',
        defaultPath,
        filters: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }],
        properties: ['createDirectory', 'showOverwriteConfirmation'],
      },
    );
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    const buffer = decodeBase64(payload.base64);
    if (buffer.length < 4 || buffer.subarray(0, 2).toString('utf8') !== 'PK') {
      throw new Error('Excel 数据无效');
    }
    const written = await writeFileSafe(result.filePath, buffer);
    lastOutputPath = path.dirname(written.path);
    return { ok: true, path: written.path, fallback: written.fallback, originalError: written.originalError };
  });

  ipcMain.handle('desktop:save-package', async (_event, payload = {}) => {
    const base = safeName(payload.baseName || '跨多多标题工坊-批量', '跨多多标题工坊-批量').replace(/\.(xlsx|xls|csv)$/i, '');
    let chosenDir = '';
    if (payload.outputDir) {
      const resolved = path.resolve(String(payload.outputDir));
      try {
        const stat = await fsp.stat(resolved);
        if (stat.isDirectory()) {
          await fsp.access(resolved, fs.constants.W_OK);
          chosenDir = resolved;
        }
      } catch {
        chosenDir = '';
      }
    }
    if (!chosenDir) {
      const picked = await dialog.showOpenDialog(mainWindow || undefined, {
        title: '选择保存位置',
        buttonLabel: '保存到这里',
        defaultPath: ensureExportDir(),
        properties: ['openDirectory', 'createDirectory'],
      });
      if (picked.canceled || !picked.filePaths?.[0]) return { ok: false, canceled: true };
      chosenDir = picked.filePaths[0];
    }

    const target = await uniqueDirectory(path.join(chosenDir, base));
    const imagesDir = path.join(target, 'images');
    await fsp.mkdir(imagesDir, { recursive: true });

    const xlsx = decodeBase64(payload.xlsxBase64);
    if (xlsx.length < 4 || xlsx.subarray(0, 2).toString('utf8') !== 'PK') {
      throw new Error('Excel 数据无效');
    }
    await fsp.writeFile(path.join(target, `${base}.xlsx`), xlsx);

    let writtenImages = 0;
    let skippedImages = 0;
    const images = Array.isArray(payload.images) ? payload.images : [];
    for (const [index, image] of images.entries()) {
      try {
        let data = null;
        if (image?.path) {
          const stat = await fsp.stat(image.path);
          if (!stat.isFile() || stat.size > 60 * 1024 * 1024) {
            skippedImages += 1;
            continue;
          }
          data = await fsp.readFile(image.path);
        } else if (image?.sampleId && /^[a-z0-9_-]+$/i.test(image.sampleId)) {
          data = await fsp.readFile(path.join(publicDir, 'samples', `${image.sampleId}.svg`));
        } else if (image?.base64) {
          data = decodeBase64(image.base64);
        }
        if (!data?.length) {
          skippedImages += 1;
          continue;
        }
        const fileName = safeFileName(image?.name || `image-${index + 1}`, `image-${index + 1}`);
        await fsp.writeFile(path.join(imagesDir, fileName), data);
        writtenImages += 1;
      } catch {
        skippedImages += 1;
      }
    }

    await fsp.writeFile(
      path.join(target, `${base}-预览.html`),
      String(payload.previewHtml || ''),
      'utf8',
    );
    await fsp.writeFile(
      path.join(target, `${base}-数据.json`),
      String(payload.dataJson || '{}'),
      'utf8',
    );

    lastOutputPath = target;
    return { ok: true, path: target, writtenImages, skippedImages };
  });

  ipcMain.handle('desktop:open-path', async (_event, target) => {
    if (typeof target !== 'string' || !target.trim()) return '路径为空';
    if (!fs.existsSync(target)) return '路径不存在';
    return shell.openPath(target);
  });

  ipcMain.handle('desktop:menu-action', async (_event, action) => {
    const win = mainWindow;
    const contents = win?.webContents;
    switch (String(action || '')) {
      case 'open-output':
        openLastOutput();
        break;
      case 'open-data':
        await shell.openPath(app.getPath('userData'));
        break;
      case 'quit':
        app.quit();
        break;
      case 'undo':
        contents?.undo();
        break;
      case 'redo':
        contents?.redo();
        break;
      case 'cut':
        contents?.cut();
        break;
      case 'copy':
        contents?.copy();
        break;
      case 'paste':
        contents?.paste();
        break;
      case 'select-all':
        contents?.selectAll();
        break;
      case 'reload':
        contents?.reload();
        break;
      case 'reset-zoom':
        contents?.setZoomLevel(0);
        break;
      case 'zoom-in': {
        const level = contents?.getZoomLevel() || 0;
        contents?.setZoomLevel(Math.min(3, level + 0.5));
        break;
      }
      case 'zoom-out': {
        const level = contents?.getZoomLevel() || 0;
        contents?.setZoomLevel(Math.max(-3, level - 0.5));
        break;
      }
      case 'fullscreen':
        if (win) win.setFullScreen(!win.isFullScreen());
        break;
      case 'devtools':
        contents?.toggleDevTools();
        break;
      case 'about':
        showAbout();
        break;
      default:
        return { ok: false, error: 'unknown menu action' };
    }
    return { ok: true };
  });
}

app.on('before-quit', () => {
  clearTimeout(stateTimer);
  persistWindowState();
  if (localServer) {
    try {
      localServer.close();
    } catch {
      // 忽略关闭失败
    }
    localServer = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && appUrl) createWindow();
});

process.on('uncaughtException', (error) => {
  console.error('[main] uncaughtException', error);
  if (app.isReady()) {
    dialog.showErrorBox('跨多多标题工坊遇到错误', error?.message || String(error));
  }
});

process.on('unhandledRejection', (error) => {
  console.error('[main] unhandledRejection', error);
});
