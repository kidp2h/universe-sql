const { session } = require("electron");

/**
 * Content-Security-Policy for the renderer.
 *
 * - Production (static export): no `unsafe-eval` — satisfies Electron security guidance when packaged.
 * - Development (Next.js dev server): includes `unsafe-eval` for HMR; Electron may still log a CSP
 *   warning in dev — that is expected and does not appear for packaged builds.
 */
const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const DEVELOPMENT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http://localhost:* http://127.0.0.1:*",
  "font-src 'self' data:",
  "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

function setupContentSecurityPolicy(isDevelopment) {
  const policy = isDevelopment ? DEVELOPMENT_CSP : PRODUCTION_CSP;

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...(details.responseHeaders ?? {}) };

    if (
      details.resourceType === "mainFrame" ||
      details.resourceType === "subFrame"
    ) {
      responseHeaders["Content-Security-Policy"] = [policy];
    }

    callback({ responseHeaders });
  });
}

module.exports = { setupContentSecurityPolicy };
