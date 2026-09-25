/**
 * /api/export/[id]/png
 * GET: Export canvas diagram as PNG
 * Spec §4 (Export Pipeline).
 */

import { type NextRequest, NextResponse } from "next/server";
import { diagramJsonToPng } from "@/lib/export/png-export";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const scale = parseInt(searchParams.get("scale") || "2", 10);
  const width = parseInt(searchParams.get("width") || "1920", 10);
  const height = parseInt(searchParams.get("height") || "1080", 10);

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
    const pngBuffer = await diagramJsonToPng(diagram, {
      width,
      height,
      scale,
    });

    const fileName = `${canvas.title || "architecture"}.png`.replace(/[^a-z0-9.-]/gi, "_");

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}