/**
 * POST /api/runs
 * Initiates an agent generation or edit run for a canvas.
 * Enforces session ownership and kicks off async graph execution.
 * Spec §2 & §4.
 */

import { type NextRequest, NextResponse } from "next/server";
import { startAgentRun } from "@/lib/agent/runner";
import { assertCanvasOwnership, getSessionId } from "@/lib/session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionId = await getSessionId();
    const body = (await request.json()) as {
      canvasId?: string;
      prompt?: string;
      type?: "generate" | "edit";
      model?: string;
    };

    if (!body.canvasId || typeof body.canvasId !== "string") {
      return NextResponse.json({ error: "Missing required 'canvasId'" }, { status: 400 });
    }

    if (!body.prompt || typeof body.prompt !== "string" || body.prompt.trim() === "") {
      return NextResponse.json({ error: "Missing or empty 'prompt'" }, { status: 400 });
    }

    // Verify session owns canvas
    await assertCanvasOwnership(body.canvasId, sessionId);

    const { runId } = await startAgentRun({
      canvasId: body.canvasId,
      sessionId,
      prompt: body.prompt.trim(),
      type: body.type ?? "generate",
      model: body.model,
    });

    return NextResponse.json({ runId, status: "running" }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
