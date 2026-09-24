import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { POST as handlePostCanvas, GET as handleGetCanvases } from "@/app/api/canvases/route";
import { POST as handlePostSession, GET as handleGetSession } from "@/app/api/session/route";
import { decryptNimKey } from "@/lib/crypto";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:./dev.db" } },
});

let testSessionId: string;

beforeAll(async () => {
  process.env["NIM_ENCRYPTION_KEY"] = "e".repeat(64);
  const session = await prisma.session.create({ data: {} });
  testSessionId = session.id;

  // Mock next/headers
  vi.mock("next/headers", () => ({
    headers: async () => ({
      get: (name: string) => (name.toLowerCase() === "x-session-id" ? testSessionId : null),
    }),
    cookies: async () => ({
      get: (name: string) => (name === "sid" ? { value: testSessionId } : undefined),
    }),
  }));
});

afterAll(async () => {
  await prisma.session.delete({ where: { id: testSessionId } });
  await prisma.$disconnect();
});

describe("Canvases & Session API Routes", () => {
  it("creates a canvas and starts an agent run via POST /api/canvases", async () => {
    const req = new NextRequest("http://localhost:3000/api/canvases", {
      method: "POST",
      body: JSON.stringify({ prompt: "Design an AKS microservices cluster with Cosmos DB" }),
    });

    const res = await handlePostCanvas(req);
    expect(res.status).toBe(201);

    const body = (await res.json()) as { success: boolean; canvasId: string; runId: string };
    expect(body.success).toBe(true);
    expect(body.canvasId).toBeDefined();

    // Verify record in database
    const canvas = await prisma.canvas.findUnique({
      where: { id: body.canvasId },
    });
    expect(canvas).not.toBeNull();
    expect(canvas!.sessionId).toBe(testSessionId);
  });

  it("lists canvases for session via GET /api/canvases", async () => {
    const res = await handleGetCanvases();
    expect(res.status).toBe(200);

    const body = (await res.json()) as { canvases: Array<{ id: string; title: string }> };
    expect(body.canvases.length).toBeGreaterThan(0);
    expect(body.canvases[0]!.title).toBeDefined();
  });

  it("encrypts and saves a user-provided NIM API key via POST /api/session", async () => {
    const rawKey = "nvapi-test-api-key-xyz-987";
    const req = new NextRequest("http://localhost:3000/api/session", {
      method: "POST",
      body: JSON.stringify({ apiKey: rawKey }),
    });

    const res = await handlePostSession(req);
    expect(res.status).toBe(200);

    const session = await prisma.session.findUnique({
      where: { id: testSessionId },
      select: { nimKeyEncrypted: true },
    });

    expect(session?.nimKeyEncrypted).not.toBeNull();
    expect(session?.nimKeyEncrypted).not.toBe(rawKey);
    expect(decryptNimKey(session!.nimKeyEncrypted!)).toBe(rawKey);
  });

  it("updates the session default model and retrieves updated settings via GET /api/session", async () => {
    const targetModel = "deepseek-ai/deepseek-r1";
    const req = new NextRequest("http://localhost:3000/api/session", {
      method: "POST",
      body: JSON.stringify({ defaultModel: targetModel }),
    });

    const postRes = await handlePostSession(req);
    expect(postRes.status).toBe(200);

    const getRes = await handleGetSession();
    expect(getRes.status).toBe(200);

    const settings = (await getRes.json()) as { hasKey: boolean; defaultModel: string };
    expect(settings.hasKey).toBe(true);
    expect(settings.defaultModel).toBe(targetModel);
  });
});
