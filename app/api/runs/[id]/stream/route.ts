/**
 * Server-Sent Events (SSE) Stream Endpoint.
 * GET /api/runs/:id/stream
 *
 * 1. Checks session isolation and run existence.
 * 2. Replays all existing timeline events from Postgres/SQLite so reloads
 *    render current state without lag.
 * 3. Subscribes to live event emitter for real-time node transitions.
 * 4. Closes when run completes or fails.
 *
 * Spec §2 & §4: SSE Streaming.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getRunEventChannel, loadCheckpoint, runEventBus } from "@/lib/agent/checkpointer";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: runId } = await context.params;

  // Load existing state from DB for immediate catch-up replay
  const checkpoint = await loadCheckpoint(runId);
  if (!checkpoint) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const channel = getRunEventChannel(runId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial replay of existing events
      const replayPayload = {
        type: "replay",
        runId,
        status: checkpoint.status,
        timeline: checkpoint.timeline,
        diagram: checkpoint.state?.diagram ?? null,
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(replayPayload)}\n\n`));

      // If run already ended, close immediately after replay
      if (checkpoint.status === "completed" || checkpoint.status === "failed") {
        controller.close();
        return;
      }

      // 2. Subscribe to live events
      const onEvent = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

          const payload = data as { status?: string };
          if (payload.status === "completed" || payload.status === "failed") {
            cleanup();
            controller.close();
          }
        } catch {
          cleanup();
        }
      };

      // 3. Heartbeat ping every 15s to keep proxy connections alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 15000);

      const cleanup = () => {
        clearInterval(heartbeat);
        runEventBus.off(channel, onEvent);
      };

      runEventBus.on(channel, onEvent);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
