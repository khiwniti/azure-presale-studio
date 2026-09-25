/**
 * /api/export/[id]/terraform
 * GET: Export canvas diagram as Terraform HCL
 * Spec §4 (Export Pipeline - IaC).
 */

import { type NextRequest, NextResponse } from "next/server";
import { diagramJsonToTerraform } from "@/lib/export/terraform-emitter";
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
    const terraformString = diagramJsonToTerraform(diagram);

    const fileName = `${canvas.title || "architecture"}.tf`.replace(/[^a-z0-9.-]/gi, "_");

    return new NextResponse(terraformString, {
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