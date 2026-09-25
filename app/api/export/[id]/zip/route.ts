/**
 * /api/export/[id]/zip
 * GET: Export canvas diagram as ZIP bundle
 * Spec §4 (Export Pipeline - Documents).
 */

import { type NextRequest, NextResponse } from "next/server";
import { createDeliverablesZip } from "@/lib/export/zip-packager";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  
  const options = {
    includeSvg: searchParams.get("svg") !== "false",
    includePng: searchParams.get("png") !== "false",
    includeBicep: searchParams.get("bicep") !== "false",
    includeTerraform: searchParams.get("terraform") !== "false",
    includeDocx: searchParams.get("docx") !== "false",
    includeXlsx: searchParams.get("xlsx") !== "false",
    pngScale: parseInt(searchParams.get("scale") || "2", 10),
  };

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
    const zipBuffer = await createDeliverablesZip(diagram, options);

    const fileName = `${canvas.title || "architecture"}_deliverables.zip`.replace(/[^a-z0-9.-]/gi, "_");

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}