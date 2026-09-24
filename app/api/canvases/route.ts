/**
 * /api/canvases
 * GET: List recent architecture canvases for current session
 * POST: Create a new canvas and kick off initial architecture generation
 *
 * Spec §2 & §5.
 */

import { type NextRequest, NextResponse } from "next/server";
import { startAgentRun } from "@/lib/agent/runner";
import { prisma } from "@/lib/prisma";
import { getSessionId, touchSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const sessionId = await getSessionId();
    await touchSession(sessionId);

    const canvases = await prisma.canvas.findMany({
      where: { sessionId },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        diagramJson: true,
      },
    });

    const items = canvases.map((c) => {
      let nodeCount = 0;
      try {
        const parsed = JSON.parse(c.diagramJson) as { nodes?: unknown[] };
        nodeCount = parsed.nodes?.length ?? 0;
      } catch {
        // Fallback
      }
      return {
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt.toISOString(),
        nodeCount,
      };
    });

    return NextResponse.json({ canvases: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, canvases: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionId = await getSessionId();
    await touchSession(sessionId);

    const body = (await request.json()) as { prompt?: string; model?: string };
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
    }

    // Derive a clean title from the prompt
    let title = prompt.slice(0, 48);
    const firstPeriod = title.indexOf(".");
    if (firstPeriod > 10) {
      title = title.slice(0, firstPeriod);
    }
    title = title.replace(/^(design|build|create|architect|plan)\s+(an?|the)?\s*/i, "");
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Initial canonical diagram JSON shell (spec §3)
    const initialDiagram = {
      version: 1,
      meta: {
        title,
        region: "eastus",
        description: prompt,
      },
      groups: [],
      nodes: [],
      edges: [],
    };

    // Create Canvas record
    const canvas = await prisma.canvas.create({
      data: {
        sessionId,
        title,
        diagramJson: JSON.stringify(initialDiagram),
      },
    });

    // Start background agent run
    const { runId } = await startAgentRun({
      canvasId: canvas.id,
      sessionId,
      prompt,
      type: "generate",
      model: body.model,
    });

    return NextResponse.json({
      success: true,
      canvasId: canvas.id,
      runId,
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
