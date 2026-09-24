import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { buildArchitectureGraph } from "../graph";
import { saveCheckpoint, loadCheckpoint } from "../checkpointer";
import { startAgentRun } from "../runner";
import type { AgentGraphState } from "../types";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:./dev.db" } },
});

let testSessionId: string;
let testCanvasId: string;

beforeAll(async () => {
  process.env["NIM_ENCRYPTION_KEY"] = "d".repeat(64);
  const session = await prisma.session.create({ data: {} });
  testSessionId = session.id;

  const canvas = await prisma.canvas.create({
    data: { sessionId: testSessionId, title: "Test Architecture Canvas" },
  });
  testCanvasId = canvas.id;
});

afterAll(async () => {
  await prisma.session.delete({ where: { id: testSessionId } });
  await prisma.$disconnect();
});

describe("LangGraph Architecture Graph", () => {
  it("executes all 5 nodes end-to-end and outputs valid DiagramJson", async () => {
    const run = await prisma.run.create({
      data: { canvasId: testCanvasId, type: "generate", status: "running" },
    });

    const graph = buildArchitectureGraph();

    const initialState: AgentGraphState = {
      runId: run.id,
      canvasId: testCanvasId,
      sessionId: testSessionId,
      prompt: "Design a highly available e-commerce platform on Azure with Redis cache and SQL Database",
      intent: "generate",
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      validationErrors: [],
      builderRetryCount: 0,
      reviewFindings: [],
      reviewLoopCount: 0,
      timeline: [],
      status: "running",
    };

    const result = (await graph.invoke(initialState)) as unknown as AgentGraphState;

    // 1. Verify status
    expect(result.status).toBe("completed");

    // 2. Verify research brief
    expect(result.researchBrief).toBeDefined();
    expect(result.researchBrief!.citations.length).toBeGreaterThan(0);
    expect(result.researchBrief!.pricingEstimates.length).toBeGreaterThan(0);

    // 3. Verify ADR
    expect(result.adr).toBeDefined();
    expect(result.adr!.services.length).toBeGreaterThan(0);
    expect(result.adr!.redundancyStrategy).toBeDefined();

    // 4. Verify diagram JSON
    expect(result.diagram).toBeDefined();
    expect(result.diagram!.version).toBe(1);
    expect(result.diagram!.nodes.length).toBeGreaterThan(0);

    // Verify all nodes have real ARM types from registry
    for (const node of result.diagram!.nodes) {
      expect(node.service).toMatch(/^Microsoft\./);
      expect(node.position.x).toBeGreaterThan(0);
      expect(node.position.y).toBeGreaterThan(0);
    }

    // 5. Verify timeline recorded transitions
    expect(result.timeline.length).toBeGreaterThanOrEqual(4);
    const completedNodes = result.timeline.map((t) => t.node);
    expect(completedNodes).toContain("supervisor");
    expect(completedNodes).toContain("researcher");
    expect(completedNodes).toContain("architect");
    expect(completedNodes).toContain("diagram_builder");
  }, 25000);

  it("checkpoints graph state and timeline events to database", async () => {
    const run = await prisma.run.create({
      data: { canvasId: testCanvasId, type: "generate", status: "running" },
    });

    const state: AgentGraphState = {
      runId: run.id,
      canvasId: testCanvasId,
      sessionId: testSessionId,
      prompt: "Test Checkpoint",
      intent: "generate",
      model: "default",
      validationErrors: [],
      builderRetryCount: 0,
      reviewFindings: [],
      reviewLoopCount: 0,
      timeline: [],
      status: "running",
    };

    await saveCheckpoint(run.id, state, {
      node: "researcher",
      status: "completed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      findings: "Tested checkpoint persistence",
    });

    const loaded = await loadCheckpoint(run.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.timeline.length).toBe(1);
    expect(loaded!.timeline[0]!.node).toBe("researcher");
    expect(loaded!.timeline[0]!.findings).toBe("Tested checkpoint persistence");
  });

  it("starts agent run asynchronously and records messages", async () => {
    const { runId } = await startAgentRun({
      canvasId: testCanvasId,
      sessionId: testSessionId,
      prompt: "Create an AKS cluster architecture",
    });

    expect(runId).toBeDefined();

    // Verify Run was written to DB
    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: { messages: true },
    });

    expect(run).not.toBeNull();
    expect(run!.canvasId).toBe(testCanvasId);
    expect(run!.messages.length).toBeGreaterThan(0);
    expect(run!.messages[0]!.content).toBe("Create an AKS cluster architecture");
  });
});
