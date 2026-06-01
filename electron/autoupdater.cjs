const { autoUpdater } = require("electron-updater"); // ✅
const { ipcMain, app } = require("electron");
const log = require("electron-log");
const path = require("node:path");
const fs = require("node:fs");

// Cấu hình log
autoUpdater.logger = log;
autoUpdater.autoDownload = false; // Hỏi user trước khi tải
autoUpdater.allowPrerelease = true; // Cho phép kiểm tra cả các bản Pre-release trên GitHub

// Hỗ trợ test trong môi trường dev nếu có file dev-app-update.yml
if (!app.isPackaged) {
  autoUpdater.forceDevUpdateConfig = true;
}

function setupAutoUpdater(win) {
  // Chỉ tự động kiểm tra update khi app đã đóng gói (production)
  if (app.isPackaged) {
    const updateConfigPath = path.join(process.resourcesPath, "app-update.yml");
    if (fs.existsSync(updateConfigPath)) {
      try {
        autoUpdater.checkForUpdates();
      } catch (err) {
        log.error("[AutoUpdater] Error during checkForUpdates:", err);
      }
    } else {
      log.warn(
        "[AutoUpdater] app-update.yml not found. Auto-update check skipped.",
      );
    }
  }

  // Có update mới
  autoUpdater.on("update-available", (info) => {
    win.webContents.send("update-available", info);
  });

  // Không có update
  autoUpdater.on("update-not-available", () => {
    win.webContents.send("update-not-available");
  });

  // Tiến trình tải
  autoUpdater.on("download-progress", (progress) => {
    win.webContents.send("download-progress", progress);
  });

  // Tải xong
  autoUpdater.on("update-downloaded", () => {
    win.webContents.send("update-downloaded");
  });

  // Lỗi
  autoUpdater.on("error", (err) => {
    win.webContents.send("update-error", err.message);
  });

  // Nhận lệnh từ renderer
  ipcMain.on("start-download", () => {
    try {
      autoUpdater.downloadUpdate();
    } catch (err) {
      win.webContents.send("update-error", err.message);
    }
  });

  ipcMain.on("install-update", () => {
    try {
      autoUpdater.quitAndInstall();
    } catch (err) {
      win.webContents.send("update-error", err.message);
    }
  });

  ipcMain.on("check-for-updates", () => {
    const updateConfigPath = path.join(process.resourcesPath, "app-update.yml");
    if (app.isPackaged && !fs.existsSync(updateConfigPath)) {
      win.webContents.send(
        "update-error",
        "Error: Update configuration file (app-update.yml) not found. Please build using dist:publish.",
      );
      return;
    }
    try {
      autoUpdater.checkForUpdates();
    } catch (err) {
      win.webContents.send("update-error", err.message);
    }
  });
}

module.exports = { setupAutoUpdater };
