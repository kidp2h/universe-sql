const { spawn } = require("node:child_process");
const { app, safeStorage } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

function decryptPassword(password) {
  if (!password) return "";
  if (password.startsWith("__safe_storage__:")) {
    if (safeStorage?.isEncryptionAvailable()) {
      try {
        const base64 = password.substring("__safe_storage__:".length);
        return safeStorage.decryptString(Buffer.from(base64, "base64"));
      } catch (err) {
        console.error(
          "[Dump] Failed to decrypt password using safeStorage:",
          err,
        );
      }
    }
  }
  return password;
}

function getPgDumpPath() {
  const platform = process.platform; // 'win32' | 'darwin' | 'linux'
  const exeExtension = platform === "win32" ? ".exe" : "";
  const binaryName = `pg_dump${exeExtension}`;

  if (app.isPackaged) {
    // In Production mode, electron-builder copies extraResources to process.resourcesPath/bin/
    return path.join(process.resourcesPath, "bin", binaryName);
  } else {
    // In Development mode, resource folder is in the project root
    return path.join(
      __dirname,
      "..",
      "..",
      "resources",
      "bin",
      platform,
      binaryName,
    );
  }
}

function dumpPostgres(options, onProgress) {
  const {
    host,
    port,
    user,
    password,
    database,
    outputPath,
    schema,
    tables,
    schemaOnly,
    dataOnly,
    inserts,
    format = "plain",
    noOwner = true,
    noPrivileges = false,
    clean = true,
    ifExists = true,
  } = options;

  const pgDumpPath = getPgDumpPath();

  const isWindows = process.platform === "win32";
  const useTempFile = isWindows;
  let pgDumpOutputPath = outputPath;
  let tempFilePath = "";

  if (useTempFile) {
    const publicDir = process.env.PUBLIC || "C:\\Users\\Public";
    const tempFileName = `usql_backup_${Date.now()}_temp.sql`;
    tempFilePath = path.join(publicDir, tempFileName);
    pgDumpOutputPath = tempFilePath;
  }

  return new Promise((resolve) => {
    if (!fs.existsSync(pgDumpPath)) {
      return resolve({
        success: false,
        error: `Could not find pg_dump binary at: ${pgDumpPath}`,
      });
    }

    const args = [
      "--host",
      host,
      "--port",
      String(port),
      "--username",
      user,
      "--dbname",
      database,
      "--format",
      format,
      "--file",
      pgDumpOutputPath,
      "--verbose",
    ];

    if (schemaOnly) args.push("--schema-only");
    else if (dataOnly) args.push("--data-only");

    if (inserts) args.push("--inserts");

    if (clean && !dataOnly) args.push("--clean");
    if (ifExists) args.push("--if-exists");
    if (noOwner) args.push("--no-owner");
    if (noPrivileges) args.push("--no-privileges");

    if (schema) args.push("--schema", schema);
    tables?.forEach((t) => args.push("--table", t));

    const env = { ...process.env, PGPASSWORD: decryptPassword(password) };
    const start = Date.now();
    const child = spawn(pgDumpPath, args, { env });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      const line = chunk.toString();
      stderr += line;
      if (onProgress) onProgress(line.trim());
    });

    child.on("close", (code) => {
      if (code === 0) {
        if (useTempFile && fs.existsSync(tempFilePath)) {
          try {
            // Node.js natively supports Unicode paths on Windows, so this copy will succeed flawlessly!
            fs.copyFileSync(tempFilePath, outputPath);
            fs.unlinkSync(tempFilePath);
            resolve({
              success: true,
              path: outputPath,
              durationMs: Date.now() - start,
            });
          } catch (copyErr) {
            resolve({
              success: false,
              error: `Dump succeeded, but failed to copy file to destination: ${copyErr.message}`,
            });
            try {
              fs.unlinkSync(tempFilePath);
            } catch (_e) {}
          }
        } else {
          resolve({
            success: true,
            path: outputPath,
            durationMs: Date.now() - start,
          });
        }
      } else {
        if (useTempFile && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (_e) {}
        }
        resolve({ success: false, error: stderr });
      }
    });

    child.on("error", (err) => {
      if (useTempFile && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (_e) {}
      }
      resolve({ success: false, error: err.message });
    });
  });
}

module.exports = { dumpPostgres };
