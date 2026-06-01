const { dialog, shell } = require("electron");
const fs = require("node:fs");
const { dumpPostgres } = require("../lib/dump.cjs");

function registerExportHandlers(ipcMain) {
  ipcMain.handle("show-save-dialog", async (_event, options) => {
    return dialog.showSaveDialog(options);
  });

  ipcMain.handle("show-open-dialog", async (_event, options) => {
    return dialog.showOpenDialog(options);
  });

  ipcMain.handle(
    "write-file-content",
    async (_event, { filePath, content, encoding = "utf8" }) => {
      try {
        let data = content;
        if (encoding === "base64") {
          // Robustly extract the base64 payload from data URL if present
          const base64Match =
            content.match(/;base64,(.*)$/s) || content.match(/base64,(.*)$/s);
          const rawBase64 = base64Match ? base64Match[1] : content;
          const cleanBase64 = rawBase64.replace(/\s/g, ""); // Remove whitespace/newlines
          data = Buffer.from(cleanBase64, "base64");
          await fs.promises.writeFile(filePath, data);
        } else {
          await fs.promises.writeFile(filePath, content, encoding);
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
  );

  ipcMain.handle("show-item-in-folder", async (_event, filePath) => {
    shell.showItemInFolder(filePath);
    return { ok: true };
  });

  ipcMain.handle("open-path", async (_event, filePath) => {
    try {
      await shell.openPath(filePath);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });

  ipcMain.handle("dump:postgres", async (event, options) => {
    return dumpPostgres(options, (line) => {
      event.sender.send("dump:progress", line);
    });
  });
}

module.exports = { registerExportHandlers };
