const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

// Read config to disable hardware acceleration if requested
try {
  const userDataPath = app.getPath("userData");
  const configPath = path.join(userDataPath, "config.json");
  if (fs.existsSync(configPath)) {
    const configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (configData && configData.disableGpu === true) {
      app.disableHardwareAcceleration();
    }
  }
} catch (e) {
  console.error("[Main] Failed to check GPU acceleration config:", e);
}

const { registerWindowHandlers } = require("./handlers/window.cjs");
const { registerDbHandlers } = require("./handlers/db.cjs");
const { registerFsHandlers } = require("./handlers/fs.cjs");
const { registerExportHandlers } = require("./handlers/export.cjs");
const { setupAutoUpdater } = require("./autoupdater.cjs");
const { setupContentSecurityPolicy } = require("./security.cjs");

let isQuitting = false;

app.on("before-quit", () => {
  isQuitting = true;
});

const isMac = process.platform === "darwin";

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "text/javascript";
    case ".json":
      return "application/json";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    case ".woff2":
      return "font/woff2";
    case ".woff":
      return "font/woff";
    default:
      return "application/octet-stream";
  }
}

let staticServer = null;

function startStaticServer() {
  const outDir = path.join(__dirname, "..", "out");

  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end();
      return;
    }

    const urlPath = req.url.split("?")[0];
    const safePath = path
      .normalize(decodeURIComponent(urlPath))
      .replace(/^\.\.[\\/]/, "");
    const filePath = path.join(outDir, safePath);

    const finalPath =
      fs.existsSync(filePath) && fs.statSync(filePath).isFile()
        ? filePath
        : path.join(outDir, "index.html");

    fs.readFile(finalPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }

      res.writeHead(200, { "Content-Type": getContentType(finalPath) });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      staticServer = server;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function createWindow(startUrl) {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1366,
    minHeight: 768,
    maxWidth: 1920,
    icon: path.join(__dirname, "../assets/icon.png"),
    maxHeight: 1080,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(startUrl);
  win.maximize();

  // Mở DevTools và hỗ trợ phím tắt phát triển trong chế độ Dev
  if (!app.isPackaged) {
    // win.webContents.openDevTools();

    win.webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        const isCtrlShiftI =
          (input.control || input.meta) &&
          input.shift &&
          input.key.toLowerCase() === "i";
        const isF12 = input.key === "F12";
        if (isCtrlShiftI || isF12) {
          win.webContents.toggleDevTools();
          event.preventDefault();
        }

        // Hỗ trợ phím F5 hoặc Ctrl+R để reload trang nhanh khi Dev
        const isCtrlR =
          (input.control || input.meta) && input.key.toLowerCase() === "r";
        const isF5 = input.key === "F5";
        if (isCtrlR || isF5) {
          win.reload();
          event.preventDefault();
        }
      }
    });
  }

  win.on("close", (event) => {
    const allowClose = win.__allowClose === true || isQuitting;
    if (allowClose) {
      return;
    }

    event.preventDefault();
    event.returnValue = false;

    if (win.__pendingClose) {
      return;
    }

    win.__pendingClose = true;
    win.webContents.send("app-close-request");
  });

  return win;
}

// Initialize Handlers
registerWindowHandlers(ipcMain);
registerDbHandlers(ipcMain);
registerFsHandlers(ipcMain);
registerExportHandlers(ipcMain);

ipcMain.handle("get-app-version", () => {
  try {
    const pkg = require(path.join(__dirname, "..", "package.json"));
    return pkg.version;
  } catch {
    return app.getVersion();
  }
});

// App lifecycle
app.whenReady().then(async () => {
  setupContentSecurityPolicy(!app.isPackaged);

  Menu.setApplicationMenu(null);
  const devUrl = process.env.ELECTRON_START_URL;
  const { url } = devUrl ? { url: devUrl } : await startStaticServer();

  const mainWindow = createWindow(url);
  setupAutoUpdater(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(url);
    }
  });
});

app.on("window-all-closed", () => {
  if (staticServer) {
    try {
      staticServer.close();
    } catch (e) {
      console.error("[Main] Error closing static server:", e);
    }
  }
  if (!isMac) {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (staticServer) {
    try {
      staticServer.close();
    } catch (e) {
      console.error("[Main] Error closing static server:", e);
    }
  }
});

app.on("quit", () => {
  process.exit(0);
});

// Error handling
process.on("uncaughtException", (error) => {
  console.error("[Main] Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, _promise) => {
  console.error("[Main] Unhandled rejection:", reason);
});
