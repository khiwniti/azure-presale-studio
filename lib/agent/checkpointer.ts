/**
 * Custom Prisma-backed Checkpointer & Event Broadcaster.
 * Persists graph state and timeline events to the database on every node transition.
 * Spec §2: Checkpointing.
 */

import { EventEmitter } from "events";
import { prisma } from "@/lib/prisma";
import type { AgentGraphState, TimelineEvent } from "./types";

// Process-wide event bus for broadcasting run progress to active SSE subscriptions
export const runEventBus = new EventEmitter();
runEventBus.setMaxListeners(100);

export function getRunEventChannel(runId: string): string {
  return `run:${runId}`;
}

/**
 * Saves a checkpoint at a node transition.
 * Writes `graphState` and `timelineEvents` to the database and emits an SSE event.
 */
export async function saveCheckpoint(
  runId: string,
  state: AgentGraphState,
  event: TimelineEvent
): Promise<void> {
  // Update timeline in-memory
  const existingIndex = state.timeline.findIndex(
    (e) => e.node === event.node && e.status === "running"
  );
  if (existingIndex >= 0 && event.status !== "running") {
    state.timeline[existingIndex] = event;
  } else {
    state.timeline.push(event);
  }

  // Persist to database
  try {
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: state.status,
        graphState: JSON.stringify(state),
        timelineEvents: JSON.stringify(state.timeline),
        error: state.error ?? null,
      },
    });

    // If diagram was generated, also update the canvas diagramJson
    if (state.diagram && state.status === "completed") {
      await prisma.canvas.update({
        where: { id: state.canvasId },
        data: {
          diagramJson: JSON.stringify(state.diagram),
          title: state.diagram.meta.title || undefined,
        },
      });
    }
  } catch (err: unknown) {
    // P2025: Record to update not found (e.g. test cleanup or deleted run)
    const isNotFound = typeof err === "object" && err !== null && "code" in err && (err as Record<string, unknown>)["code"] === "P2025";
    if (!isNotFound) {
      console.error(`[checkpointer] Failed to save checkpoint for run ${runId}:`, err);
    }
  }

  // Broadcast event over event bus for immediate SSE streaming
  runEventBus.emit(getRunEventChannel(runId), {
    type: "timeline",
    runId,
    event,
    status: state.status,
    diagram: state.diagram ?? null,
    error: state.error ?? null,
  });
}

/**
 * Loads the latest checkpoint for a run from the database.
 */
export async function loadCheckpoint(runId: string): Promise<{
  state: AgentGraphState | null;
  timeline: TimelineEvent[];
  status: string;
} | null> {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: { graphState: true, timelineEvents: true, status: true },
  });

  if (!run) return null;

  let state: AgentGraphState | null = null;
  let timeline: TimelineEvent[] = [];

  if (run.graphState) {
    try {
      state = JSON.parse(run.graphState) as AgentGraphState;
    } catch {
      // Ignore parse failure
    }
  }

  if (run.timelineEvents) {
    try {
      timeline = JSON.parse(run.timelineEvents) as TimelineEvent[];
    } catch {
      // Ignore parse failure
    }
  }

  return { state, timeline, status: run.status };
}
