/**
 * /api/canvases/[id]
 * GET: Fetch a single canvas by ID
 * PATCH: Update diagram JSON for a canvas
 *
 * Spec §2 & §5.
 */

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const sessionId = await getSessionId();
    const canvas = await prisma.canvas.findUnique({
      where: { id, sessionId },
      select: { diagramJson: true },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    return NextResponse.json({ diagramJson: canvas.diagramJson });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const sessionId = await getSessionId();
    const body = (await request.json()) as { diagramJson?: string };

    if (!body.diagramJson) {
      return NextResponse.json({ error: "diagramJson required" }, { status: 400 });
    }

    const canvas = await prisma.canvas.findUnique({
      where: { id, sessionId },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    await prisma.canvas.update({
      where: { id },
      data: { diagramJson: body.diagramJson },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
