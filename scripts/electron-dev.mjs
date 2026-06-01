import { spawn } from "node:child_process";

const isLogEnabled =
  process.env.NEXT_PUBLIC_ENABLE_LOG === "true" ||
  process.env.ENABLE_LOG === "true";
const logger = {
  log: (...args) => {
    if (isLogEnabled) {
      console.log(...args);
    }
  },
};

const DEV_URL = "http://localhost:3000";

const devServer = spawn("bunx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NEXT_DISABLE_TURBOPACK: "1",
  },
});

let electronProcess;
let isClosing = false;

async function waitForServer(url, retries = 120, delayMs = 500) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore until server is up.
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function startElectron() {
  await waitForServer(DEV_URL);

  if (isClosing) return;
  electronProcess = spawn("bunx", ["electron", "./electron/main.cjs"], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ELECTRON_START_URL: DEV_URL,
    },
  });

  electronProcess.on("close", (code) => {
    // If electron process exits and we are not closing, let user know or handle it
    if (!isClosing && code !== 0) {
      logger.log(`[Dev] Electron exited with code ${code}`);
    }
  });
}

function cleanup() {
  isClosing = true;
  if (electronProcess) {
    electronProcess.kill();
  }

  devServer.kill();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

startElectron().catch((error) => {
  console.error(error);
  cleanup();
  process.exit(1);
});
