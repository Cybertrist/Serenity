// The only bridge between the page and Electron. It carries window controls and two events,
// never a key or a secret: the vault stays entirely inside the page, as in a browser.
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

/** @param {string} channel @param {(...args: unknown[]) => void} callback */
function listen(channel, callback) {
  const handler = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("serenityDesktop", {
  platform: process.platform,
  minimize: () => ipcRenderer.send("serenity:minimize"),
  toggleMaximize: () => ipcRenderer.send("serenity:toggle-maximize"),
  close: () => ipcRenderer.send("serenity:close"),
  isMaximized: () => ipcRenderer.invoke("serenity:is-maximized"),
  onMaximized: (callback) => listen("serenity:maximized", callback),
  onLock: (callback) => listen("serenity:lock", callback),
  server: () => ipcRenderer.invoke("serenity:server"),
  setServer: (url) => ipcRenderer.invoke("serenity:set-server", url),
  changeServer: () => ipcRenderer.send("serenity:change-server"),
});
