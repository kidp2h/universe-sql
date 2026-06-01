const { contextBridge, ipcRenderer, shell } = require("electron");

if (
  typeof process !== "undefined" &&
  process.env &&
  (process.env.NEXT_PUBLIC_ENABLE_LOG === "true" ||
    process.env.ENABLE_LOG === "true")
) {
  console.log("[Preload] Loading...");
}

// Database & App APIs
contextBridge.exposeInMainWorld("electron", {
  ping: () => "pong",
  testConnection: (payload) => ipcRenderer.invoke("test-connection", payload),
  getSchemas: (payload) => ipcRenderer.invoke("get-schemas", payload),
  getTables: (connection, schema) =>
    ipcRenderer.invoke("get-tables", { connection, schema }),
  getColumns: (connection, schema, table) =>
    ipcRenderer.invoke("get-columns", { connection, schema, table }),
  getIndexes: (connection, schema, table) =>
    ipcRenderer.invoke("get-indexes", { connection, schema, table }),
  getFullMetadata: (payload) =>
    ipcRenderer.invoke("get-full-metadata", payload),
  executeQuery: (payload) => ipcRenderer.invoke("execute-query", payload),
  saveQuery: (payload) => ipcRenderer.invoke("save-query", payload),
  readQuery: (filePath) => ipcRenderer.invoke("read-query", filePath),
  getFileStats: (filePaths) => ipcRenderer.invoke("get-file-stats", filePaths),
  onAppCloseRequest: (handler) => {
    ipcRenderer.on("app-close-request", handler);
    return () => ipcRenderer.removeListener("app-close-request", handler);
  },
  removeAppCloseRequest: (handler) => {
    ipcRenderer.removeListener("app-close-request", handler);
  },
  confirmClose: () => ipcRenderer.invoke("confirm-close"),
  cancelClose: () => ipcRenderer.invoke("cancel-close"),
  openExternal: (url) => shell.openExternal(url),
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),
  writeFileContent: (payload) =>
    ipcRenderer.invoke("write-file-content", payload),
  showItemInFolder: (filePath) =>
    ipcRenderer.invoke("show-item-in-folder", filePath),
  openPath: (filePath) => ipcRenderer.invoke("open-path", filePath),
  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),
  dumpPostgres: (options) => ipcRenderer.invoke("dump:postgres", options),
  validateSql: (payload) => ipcRenderer.invoke("validate-sql", payload),
  encryptPassword: (password) =>
    ipcRenderer.invoke("encrypt-password", password),
  decryptPassword: (password) =>
    ipcRenderer.invoke("decrypt-password", password),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
});

contextBridge.exposeInMainWorld("updater", {
  onUpdateAvailable: (handler) =>
    ipcRenderer.on("update-available", (_, info) => handler(info)),
  onUpdateNotAvailable: (handler) =>
    ipcRenderer.on("update-not-available", () => handler()),
  onDownloadProgress: (handler) =>
    ipcRenderer.on("download-progress", (_, progress) => handler(progress)),
  onUpdateDownloaded: (handler) =>
    ipcRenderer.on("update-downloaded", () => handler()),
  onError: (handler) =>
    ipcRenderer.on("update-error", (_, error) => handler(error)),
  startDownload: () => ipcRenderer.send("start-download"),
  installUpdate: () => ipcRenderer.send("install-update"),
  checkForUpdates: () => ipcRenderer.send("check-for-updates"),
});
