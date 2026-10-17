/**
 * StitchCode — Electron main process (hardened per the Electron security
 * checklist, 2026 edition):
 *   · contextIsolation on, nodeIntegration off, sandbox explicit
 *   · setWindowOpenHandler: no child windows; external https links go to
 *     the system browser via shell.openExternal
 *   · will-navigate guard: the renderer can never navigate away from the app
 *   · deny-all permission handler (the studio needs none)
 *   · strict CSP header (no script-src 'unsafe-inline'; the build has no
 *     inline scripts — the meta CSP in index.html is the second layer)
 *   · packaged builds get a minimal menu (no DevTools entry)
 * Fuses (runAsNode/nodeCliInspect off, ASAR integrity) are flipped by
 * electron-builder's `electronFuses` config in package.json.
 */
const { app, BrowserWindow, Menu, session, shell } = require('electron');
const path = require('path');

/* electron:dev sets this (cross-env) — the packaged app loads the build */
const DEV_URL = process.env.ELECTRON_RENDERER_URL;

const CSP =
  "default-src 'self'; " +
  "script-src 'self' blob:; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; " +
  "font-src 'self' data:; " +
  "connect-src 'self' blob:; " +
  "frame-ancestors 'none'; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self';";

/**
 * @param {string} url
 */
function isAppUrl(url) {
  if (DEV_URL) return url.startsWith(DEV_URL);
  return url.startsWith('file://');
}

function minimalMenu() {
  /* macOS needs a basic app menu for copy/paste/quit to behave; no View
     menu means no "Toggle Developer Tools" in packaged builds */
  const isMac = process.platform === 'darwin';
  const template = /** @type {import('electron').MenuItemConstructorOptions[]} */ ([
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ]);
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
    icon: path.join(__dirname, '../public/icons/icon.png'),
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
  });

  /* No child windows. External https links open in the system browser. */
  win.webContents.setWindowOpenHandler((details) => {
    if (/^https:\/\//i.test(details.url)) {
      shell.openExternal(details.url).catch(() => {});
    }
    return { action: 'deny' };
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

app.whenReady().then(() => {
  if (app.isPackaged) minimalMenu();

  /* The studio needs no powerful APIs — deny every permission request */
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'Referrer-Policy': ['strict-origin-when-cross-origin'],
      },
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
