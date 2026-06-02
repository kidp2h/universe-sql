const fs = require("node:fs");
const { dialog } = require("electron");

function registerFsHandlers(ipcMain) {
  ipcMain.handle("save-query", async (_event, payload) => {
    if (!payload || typeof payload.content !== "string") {
      return { ok: false, message: "Missing query content" };
    }

    if (payload.filePath && !payload.forceDialog) {
      try {
        await fs.promises.writeFile(payload.filePath, payload.content, "utf8");
        return { ok: true, filePath: payload.filePath };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Save failed",
        };
      }
    }

    const result = await dialog.showSaveDialog({
      title: "Save SQL",
      defaultPath: payload.suggestedName || payload.filePath || "query.sql",
      filters: [
        { name: "SQL", extensions: ["sql"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { ok: true, canceled: true };
    }

    try {
      await fs.promises.writeFile(result.filePath, payload.content, "utf8");
      return { ok: true, filePath: result.filePath };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Save failed",
      };
    }
  });

  ipcMain.handle("read-query", async (_event, filePath) => {
    if (!filePath) {
      return { ok: false, message: "Missing file path" };
    }

    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      return { ok: true, content };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Read failed",
      };
    }
  });

  ipcMain.handle("get-file-stats", async (_event, filePaths) => {
    if (!Array.isArray(filePaths)) {
      return { ok: false, message: "Invalid file paths" };
    }

    try {
      const stats = await Promise.all(
        filePaths.map(async (filePath) => {
          try {
            const s = await fs.promises.stat(filePath);
            return { filePath, size: s.size, mtimeMs: s.mtimeMs, ok: true };
          } catch (_e) {
            return { filePath, ok: false };
          }
        }),
      );
      return { ok: true, stats };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Stats failed",
      };
    }
  });

  ipcMain.handle("get-app-config", async () => {
    const { app } = require("electron");
    const path = require("node:path");
    const fs = require("node:fs");
    const configPath = path.join(app.getPath("userData"), "config.json");
    try {
      if (fs.existsSync(configPath)) {
        const data = await fs.promises.readFile(configPath, "utf8");
        return { ok: true, config: JSON.parse(data) };
      }
    } catch (e) {
      console.error("[FsHandler] Failed to get config:", e);
    }
    return { ok: true, config: {} };
  });

  ipcMain.handle("save-app-config", async (_event, config) => {
    const { app } = require("electron");
    const path = require("node:path");
    const fs = require("node:fs");
    const configPath = path.join(app.getPath("userData"), "config.json");
    try {
      await fs.promises.writeFile(
        configPath,
        JSON.stringify(config, null, 2),
        "utf8",
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });

  ipcMain.handle("get-user-home-dir", () => {
    const os = require("node:os");
    return os.homedir();
  });

  ipcMain.handle("read-directory", async (_event, dirPath) => {
    const path = require("node:path");
    if (!dirPath) {
      return { ok: false, message: "Missing directory path" };
    }

    try {
      const entries = await fs.promises.readdir(dirPath, {
        withFileTypes: true,
      });
      const items = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);
          let size = 0;
          let mtime = 0;

          try {
            const stats = await fs.promises.stat(fullPath);
            size = stats.size;
            mtime = stats.mtimeMs;
          } catch (_e) {
            // Ignore locked or inaccessible files/folders
          }

          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
            size,
            mtime,
          };
        }),
      );

      // Sort directories first, then files alphabetically
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return { ok: true, items };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Read directory failed",
      };
    }
  });
  ipcMain.handle("get-system-drives", async () => {
    if (process.platform !== "win32") {
      return ["/"];
    }

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const checkPromises = letters.map(async (letter) => {
      const drive = `${letter}:\\`;
      try {
        await fs.promises.access(drive, fs.constants.F_OK);
        return drive;
      } catch (_e) {
        return null;
      }
    });

    const results = await Promise.all(checkPromises);
    return results.filter(Boolean);
  });
}

module.exports = { registerFsHandlers };
