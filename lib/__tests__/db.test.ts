import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { encryptNimKey, decryptNimKey } from "../crypto";

const prisma = new PrismaClient({
  datasources: {
    db: { url: "file:./dev.db" },
  },
});

beforeAll(async () => {
  process.env["NIM_ENCRYPTION_KEY"] = "c".repeat(64);
  // Clean up any test records
  await prisma.artifact.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.run.deleteMany({});
  await prisma.canvas.deleteMany({});
  await prisma.session.deleteMany({});
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Local Database & Session Persistence", () => {
  it("creates and retrieves an anonymous session with encrypted NIM key", async () => {
    const rawNimKey = "nvapi-prod-super-secret-key-12345";
    const encrypted = encryptNimKey(rawNimKey);

    const session = await prisma.session.create({
      data: {
        nimKeyEncrypted: encrypted,
        defaultModel: "nvidia/llama-3.1-nemotron-70b-instruct",
      },
    });

    expect(session.id).toBeDefined();
    expect(session.nimKeyEncrypted).not.toBe(rawNimKey);

    // Decrypt and verify
    const fetched = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(fetched).not.toBeNull();
    expect(decryptNimKey(fetched!.nimKeyEncrypted!)).toBe(rawNimKey);
  });

  it("creates a canvas linked to the session with version 1 diagram JSON", async () => {
    const session = await prisma.session.create({
      data: { defaultModel: "nvidia/llama-3.1-nemotron-70b-instruct" },
    });

    const diagram = {
      version: 1,
      meta: { title: "E-Commerce Architecture", region: "eastus" },
      nodes: [
        {
          id: "node_1",
          service: "Microsoft.Web/sites",
          label: "Frontend Web App",
          config: { sku: "P1v3", instances: 2 },
          position: { x: 100, y: 100 },
        },
      ],
      edges: [],
      groups: [],
    };

    const canvas = await prisma.canvas.create({
      data: {
        sessionId: session.id,
        title: "E-Commerce Platform",
        diagramJson: JSON.stringify(diagram),
      },
    });

    expect(canvas.id).toBeDefined();
    expect(canvas.sessionId).toBe(session.id);
    expect(JSON.parse(canvas.diagramJson).nodes[0].service).toBe(
      "Microsoft.Web/sites"
    );
  });

  it("creates a run with checkpoint state and timeline events", async () => {
    const session = await prisma.session.create({ data: {} });
    const canvas = await prisma.canvas.create({
      data: { sessionId: session.id, title: "Test Canvas" },
    });

    const timelineEvents = [
      {
        node: "supervisor",
        status: "completed",
        startedAt: new Date().toISOString(),
        findings: "Generation request routed to researcher",
      },
      {
        node: "researcher",
        status: "running",
        startedAt: new Date().toISOString(),
      },
    ];

    const run = await prisma.run.create({
      data: {
        canvasId: canvas.id,
        type: "generate",
        status: "running",
        timelineEvents: JSON.stringify(timelineEvents),
        graphState: JSON.stringify({ currentStep: 2 }),
      },
    });

    expect(run.id).toBeDefined();
    expect(run.status).toBe("running");

    const parsedEvents = JSON.parse(run.timelineEvents);
    expect(parsedEvents).toHaveLength(2);
    expect(parsedEvents[0].node).toBe("supervisor");
  });

  it("cascades deletes when a session is removed", async () => {
    const session = await prisma.session.create({ data: {} });
    const canvas = await prisma.canvas.create({
      data: { sessionId: session.id, title: "To Delete" },
    });
    const run = await prisma.run.create({
      data: { canvasId: canvas.id, type: "generate" },
    });
    await prisma.message.create({
      data: { runId: run.id, role: "user", content: "Design a web app" },
    });

    // Delete session
    await prisma.session.delete({ where: { id: session.id } });

    // Verify cascade
    const foundCanvas = await prisma.canvas.findUnique({
      where: { id: canvas.id },
    });
    const foundRun = await prisma.run.findUnique({ where: { id: run.id } });
    expect(foundCanvas).toBeNull();
    expect(foundRun).toBeNull();
  });
});
