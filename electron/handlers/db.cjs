const {
  testHandlers,
  schemaHandlers,
  tableHandlers,
  columnHandlers,
  indexHandlers,
  queryHandlers,
  fullMetadataHandlers,
  validateSqlHandlers,
} = require("../db/handlers.cjs");

function registerDbHandlers(ipcMain) {
  ipcMain.handle("test-connection", async (_event, payload) => {
    if (!payload || !payload.dbType) {
      return { ok: false, message: "Missing database type" };
    }

    const handler = testHandlers[payload.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload);
  });

  ipcMain.handle("get-schemas", async (_event, payload) => {
    if (!payload || !payload.dbType) {
      return { ok: false, message: "Missing database type" };
    }

    const handler = schemaHandlers[payload.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload);
  });

  ipcMain.handle("get-tables", async (_event, payload) => {
    if (!payload || !payload.connection || !payload.schema) {
      return { ok: false, message: "Missing table request payload" };
    }

    const handler = tableHandlers[payload.connection.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload.connection, payload.schema);
  });

  ipcMain.handle("get-columns", async (_event, payload) => {
    if (!payload || !payload.connection || !payload.schema || !payload.table) {
      return { ok: false, message: "Missing column request payload" };
    }

    const handler = columnHandlers[payload.connection.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload.connection, payload.schema, payload.table);
  });

  ipcMain.handle("get-indexes", async (_event, payload) => {
    if (!payload || !payload.connection || !payload.schema || !payload.table) {
      return { ok: false, message: "Missing index request payload" };
    }

    const handler = indexHandlers[payload.connection.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload.connection, payload.schema, payload.table);
  });

  ipcMain.handle("execute-query", async (_event, payload) => {
    if (!payload || !payload.dbType || !payload.sql) {
      return { ok: false, message: "Missing query payload" };
    }

    const handler = queryHandlers[payload.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload, payload.sql);
  });

  ipcMain.handle("get-full-metadata", async (_event, payload) => {
    if (!payload || !payload.dbType) {
      return { ok: false, message: "Missing database type" };
    }

    const handler = fullMetadataHandlers[payload.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload);
  });

  ipcMain.handle("validate-sql", async (_event, payload) => {
    if (!payload || !payload.dbType || !payload.sql) {
      return { valid: false, message: "Missing query payload" };
    }

    const handler = validateSqlHandlers[payload.dbType];
    if (!handler) {
      return { valid: false, message: "Unsupported database type" };
    }

    return handler(payload, payload.sql);
  });

  ipcMain.handle("encrypt-password", async (_event, password) => {
    const { safeStorage } = require("electron");
    if (!password) return { ok: false, message: "Empty password" };
    if (safeStorage?.isEncryptionAvailable()) {
      try {
        const encrypted = safeStorage
          .encryptString(password)
          .toString("base64");
        return { ok: true, encrypted: `__safe_storage__:${encrypted}` };
      } catch (err) {
        return { ok: false, message: err.message || String(err) };
      }
    }
    return { ok: false, message: "safeStorage is not available" };
  });

  ipcMain.handle("decrypt-password", async (_event, password) => {
    const { safeStorage } = require("electron");
    if (!password) return { ok: false, message: "Empty password" };
    if (password.startsWith("__safe_storage__:")) {
      if (safeStorage?.isEncryptionAvailable()) {
        try {
          const base64 = password.substring("__safe_storage__:".length);
          const decrypted = safeStorage.decryptString(
            Buffer.from(base64, "base64"),
          );
          return { ok: true, decrypted };
        } catch (err) {
          return { ok: false, message: err.message || String(err) };
        }
      }
      return { ok: false, message: "safeStorage is not available" };
    }
    return { ok: true, decrypted: password };
  });
}

module.exports = { registerDbHandlers };
