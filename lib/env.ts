/**
 * Startup environment validation.
 * Import this module exactly once at the top of the Next.js instrumentation
 * file so the process crashes immediately with a clear error on misconfiguration.
 *
 * All values are typed and exported for use throughout the app.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] Missing required environment variable: ${key}\n` +
        `  Copy .env.example to .env.local and fill in a value for ${key}.`
    );
  }
  return value.trim();
}

function requireHexEnv(key: string, expectedBytes: number): string {
  const value = requireEnv(key);
  const expectedLength = expectedBytes * 2; // hex chars per byte
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length !== expectedLength) {
    throw new Error(
      `[env] ${key} must be a ${expectedLength}-character hex string (${expectedBytes} bytes).\n` +
        `  Generate one with: openssl rand -hex ${expectedBytes}`
    );
  }
  return value.toLowerCase();
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  // 64 bytes = 128 hex chars
  SESSION_SECRET: requireHexEnv("SESSION_SECRET", 64),
  // 32 bytes = 64 hex chars — AES-256 key
  NIM_ENCRYPTION_KEY: requireHexEnv("NIM_ENCRYPTION_KEY", 32),
  NIM_BASE_URL: process.env["NIM_BASE_URL"] ?? "https://integrate.api.nvidia.com/v1",
  COOKIE_DOMAIN: process.env["COOKIE_DOMAIN"] ?? "",
  NODE_ENV: (process.env["NODE_ENV"] ?? "development") as
    | "development"
    | "production"
    | "test",
} as const;

export type Env = typeof env;
