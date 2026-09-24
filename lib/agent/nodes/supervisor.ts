/**
 * Supervisor Node.
 * Classifies user intent and routes execution:
 * - New generation -> researcher -> architect -> diagram_builder -> reviewer
 * - In-chat mutation -> editor -> diagram_builder -> reviewer
 *
 * Spec §4: Supervisor Node.
 */

import { saveCheckpoint } from "../checkpointer";
import { NimClient } from "../nim-client";
import type { AgentGraphState, TimelineEvent } from "../types";

export async function supervisorNode(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  const startedAt = new Date().toISOString();

  // Broadcast start event
  await saveCheckpoint(state.runId, state, {
    node: "supervisor",
    status: "running",
    startedAt,
  });

  const nim = await NimClient.forSession(state.sessionId);

  const raw = await nim.complete({
    messages: [
      {
        role: "system",
        content: "You are the architecture supervisor. Classify the user message into 'generate' (new solution) or 'edit' (mutation to existing diagram). Respond in JSON format: {\"intent\": \"generate\" | \"edit\", \"reason\": \"string\"}",
      },
      {
        role: "user",
        content: state.prompt,
      },
    ],
    responseFormat: "json",
  });

  let intent: "generate" | "edit" = "generate";
  let findings = "Routing request to deep research pipeline";

  try {
    const parsed = JSON.parse(raw) as { intent?: string; reason?: string };
    if (parsed.intent === "edit") {
      intent = "edit";
      findings = parsed.reason ?? "Routing to canvas editor for in-place mutation";
    }
  } catch {
    // Default to generate
  }

  const completedEvent: TimelineEvent = {
    node: "supervisor",
    status: "completed",
    startedAt,
    completedAt: new Date().toISOString(),
    findings,
  };

  await saveCheckpoint(state.runId, state, completedEvent);

  return { intent };
}
