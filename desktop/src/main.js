// Serenity desktop: a dedicated, locked-down window on the user's own Serenity server.
//
// The app bundles no vault code. It opens the web client served by the user's server, so the
// origin check, the CSP and the in-memory keys work exactly as in a browser. What it adds is
// what a browser tab cannot do: its own window chrome, a global shortcut, and locking the
// vault when the session locks or the machine goes to sleep.
"use strict";

const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeTheme,
  powerMonitor,
  session,
  shell,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const CONFIG = () => path.join(app.getPath("userData"), "server.json");
const SETUP = path.join(__dirname, "setup.html");
const SHORTCUT = "CommandOrControl+Shift+Space";

/** @type {BrowserWindow | null} */
let win = null;

function readServer() {
  try {
    const { url } = JSON.parse(fs.readFileSync(CONFIG(), "utf8"));
    return normalise(url);
  } catch {
    return null;
  }
}

/** Only https, or plain http on the loopback address for local development. */
function normalise(raw) {
  try {
    const url = new URL(String(raw).trim());
    const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function saveServer(origin) {
  fs.mkdirSync(path.dirname(CONFIG()), { recursive: true });
  fs.writeFileSync(CONFIG(), JSON.stringify({ url: origin }, null, 2));
}

function load() {
  if (!win) return;
  const server = readServer();
  if (server) void win.loadURL(`${server}/`);
  else void win.loadFile(SETUP);
}

function sameApp(target) {
  if (target.startsWith("file:")) return target.split(/[?#]/)[0] === pathToFileURL(SETUP).href;
  const server = readServer();
  try {
    return server !== null && new URL(target).origin === server;
  } catch {
    return false;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    frame: false,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#070A12" : "#F2F4F9",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    title: "Serenity",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });

  win.once("ready-to-show", () => win?.show());
  win.on("maximize", () => win?.webContents.send("serenity:maximized", true));
  win.on("unmaximize", () => win?.webContents.send("serenity:maximized", false));
  win.on("closed", () => {
    win = null;
  });

  // Never navigate away from the vault: anything else opens in the real browser.
  win.webContents.on("will-navigate", (event, target) => {
    if (sameApp(target)) return;
    event.preventDefault();
    if (target.startsWith("https://")) void shell.openExternal(target);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  load();
}

function toggleWindow() {
  if (!win) return createWindow();
  if (win.isFocused()) return win.hide();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function lockVault() {
  win?.webContents.send("serenity:lock");
}

app.enableSandbox();
if (!app.requestSingleInstanceLock()) app.quit();

app.on("second-instance", () => {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  // No camera, microphone, location or notification prompt: the vault needs none of them.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, done) => {
    done(permission === "clipboard-sanitized-write");
  });

  ipcMain.on("serenity:minimize", () => win?.minimize());
  ipcMain.on("serenity:toggle-maximize", () => {
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on("serenity:close", () => win?.close());
  ipcMain.handle("serenity:is-maximized", () => win?.isMaximized() ?? false);
  ipcMain.handle("serenity:server", () => readServer());
  ipcMain.handle("serenity:set-server", (_event, raw) => {
    const origin = normalise(raw);
    if (!origin) return { ok: false, error: "Adresse invalide : il faut une adresse en https." };
    saveServer(origin);
    load();
    return { ok: true };
  });
  ipcMain.on("serenity:change-server", () => {
    try {
      fs.rmSync(CONFIG());
    } catch {
      // Nothing saved yet.
    }
    load();
  });

  // The vault locks with the machine: screen locked, sleep, or session switched away.
  powerMonitor.on("lock-screen", lockVault);
  powerMonitor.on("suspend", lockVault);
  powerMonitor.on("user-did-resign-active", lockVault);

  globalShortcut.register(SHORTCUT, toggleWindow);

  createWindow();
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => app.quit());
