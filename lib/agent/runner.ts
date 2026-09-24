/**
 * Agent Run Manager & Execution Runner.
 * Coordinates run creation, async graph execution, and SSE lifecycle.
 * Spec §2 & §4.
 */

import { prisma } from "@/lib/prisma";
import { saveCheckpoint } from "./checkpointer";
import { buildArchitectureGraph } from "./graph";
import type { AgentGraphState } from "./types";

export interface StartRunParams {
  canvasId: string;
  sessionId: string;
  prompt: string;
  type?: "generate" | "edit" | "cost" | "proposal";
  model?: string;
}

/**
 * Initializes a new Run record in Postgres/SQLite and starts graph execution.
 */
export async function startAgentRun(params: StartRunParams): Promise<{ runId: string }> {
  // Create Run record
  const run = await prisma.run.create({
    data: {
      canvasId: params.canvasId,
      type: params.type ?? "generate",
      status: "running",
      timelineEvents: JSON.stringify([
        {
          node: "supervisor",
          status: "queued",
          startedAt: new Date().toISOString(),
        },
      ]),
    },
  });

  // Record initial user message
  await prisma.message.create({
    data: {
      runId: run.id,
      role: "user",
      content: params.prompt,
    },
  });

  const initialState: AgentGraphState = {
    runId: run.id,
    canvasId: params.canvasId,
    sessionId: params.sessionId,
    prompt: params.prompt,
    intent: params.type === "edit" ? "edit" : "generate",
    model: params.model ?? "nvidia/llama-3.1-nemotron-70b-instruct",
    validationErrors: [],
    builderRetryCount: 0,
    reviewFindings: [],
    reviewLoopCount: 0,
    timeline: [],
    status: "running",
  };

  // Execute graph asynchronously
  executeGraphAsync(run.id, initialState).catch((err) => {
    console.error(`[runner] Unhandled error in run ${run.id}:`, err);
  });

  return { runId: run.id };
}

/**
 * Internal async graph executor.
 */
async function executeGraphAsync(runId: string, initialState: AgentGraphState): Promise<void> {
  const graph = buildArchitectureGraph();

  try {
    const finalState = (await graph.invoke(initialState)) as unknown as AgentGraphState;

    // Record assistant completion message
    if (finalState.diagram) {
      await prisma.message.create({
        data: {
          runId,
          role: "assistant",
          content: `Generated architecture diagram: **${finalState.diagram.meta.title}** (${finalState.diagram.nodes.length} services in ${finalState.diagram.meta.region}).`,
        },
      });
    }

    await saveCheckpoint(runId, { ...finalState, status: "completed" }, {
      node: "reviewer",
      status: "completed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      findings: "Architecture generation completed and saved to canvas.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await saveCheckpoint(runId, { ...initialState, status: "failed", error: message }, {
      node: "supervisor",
      status: "failed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error: message,
    });
  }
}
