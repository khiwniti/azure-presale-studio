import { vi } from "vitest";

// Mock next/headers for Server Actions / API routes
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => (name.toLowerCase() === "x-session-id" ? "test-session-id" : null),
  }),
  cookies: async () => ({
    get: (name: string) => (name === "sid" ? { value: "test-session-id" } : undefined),
  }),
}));

// Mock environment variables
process.env.NIM_ENCRYPTION_KEY = "e".repeat(64);
process.env.SESSION_SECRET = "a".repeat(128);