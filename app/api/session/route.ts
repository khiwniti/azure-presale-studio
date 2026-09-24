/**
 * /api/session
 * GET: Retrieve session settings (hasKey indicator and default model)
 * POST: Update encrypted NIM API key or default model
 *
 * Spec §2 & §5.
 */

import { type NextRequest, NextResponse } from "next/server";
import { encryptNimKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { getSessionId, touchSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const sessionId = await getSessionId();
    await touchSession(sessionId);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { nimKeyEncrypted: true, defaultModel: true },
    });

    return NextResponse.json({
      hasKey: Boolean(session?.nimKeyEncrypted),
      defaultModel: session?.defaultModel ?? "nvidia/llama-3.1-nemotron-70b-instruct",
    });
  } catch {
    return NextResponse.json({
      hasKey: false,
      defaultModel: "nvidia/llama-3.1-nemotron-70b-instruct",
    });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionId = await getSessionId();
    await touchSession(sessionId);

    const body = (await request.json()) as { apiKey?: string; defaultModel?: string };

    const updateData: Record<string, string> = {};

    if (body.apiKey !== undefined) {
      const trimmed = body.apiKey.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "API key cannot be empty" }, { status: 400 });
      }
      updateData["nimKeyEncrypted"] = encryptNimKey(trimmed);
    }

    if (body.defaultModel !== undefined) {
      updateData["defaultModel"] = body.defaultModel.trim();
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
