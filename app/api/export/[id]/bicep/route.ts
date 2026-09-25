/**
 * /api/export/[id]/bicep
 * GET: Export canvas diagram as Bicep
 * Spec §4 (Export Pipeline - IaC).
 */

import { type NextRequest, NextResponse } from "next/server";
import { diagramJsonToBicep } from "@/lib/export/bicep-emitter";
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
      select: { diagramJson: true, title: true },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    const diagram = JSON.parse(canvas.diagramJson);
    const bicepString = diagramJsonToBicep(diagram);

    const fileName = `${canvas.title || "architecture"}.bicep`.replace(/[^a-z0-9.-]/gi, "_");

    return new NextResponse(bicepString, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}