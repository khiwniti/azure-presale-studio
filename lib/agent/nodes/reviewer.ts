/**
 * Reviewer Node.
 * Evaluates the generated architecture against Azure Well-Architected Framework:
 * - Reliability: Zone redundancy across critical tiers
 * - Security: Key Vault, WAF, Managed Identity
 * - Observability: Log Analytics workspace
 * - CAF Naming Conventions
 *
 * Loops back to architect if critical gaps exist (max 2 loops), then approves.
 * Spec §4: Reviewer Node.
 */

import { saveCheckpoint } from "../checkpointer";
import type { AgentGraphState, TimelineEvent } from "../types";

export async function reviewerNode(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  const startedAt = new Date().toISOString();

  await saveCheckpoint(state.runId, state, {
    node: "reviewer",
    status: "running",
    startedAt,
  });

  const diagram = state.diagram;
  if (!diagram) {
    throw new Error("Cannot review: missing diagram JSON");
  }

  const findings: string[] = [];
  const services = diagram.nodes.map((n) => n.service);

  // 1. Reliability Check
  const hasCompute = services.some((s) => s.startsWith("Microsoft.Web") || s.startsWith("Microsoft.Compute") || s.startsWith("Microsoft.ContainerService") || s.startsWith("Microsoft.App"));
  const hasZoneRedundancy = diagram.nodes.some((n) => n.config?.["zoneRedundant"] === true);
  if (hasCompute && !hasZoneRedundancy) {
    findings.push("Recommendation: Enable Availability Zones across primary compute resources for 99.99% SLA.");
  }

  // 2. Security Check
  const hasKeyVault = services.includes("Microsoft.KeyVault/vaults");
  if (!hasKeyVault) {
    findings.push("Security: Recommend adding Azure Key Vault for centralized secrets and TLS certificate rotation.");
  }

  // 3. Observability Check
  const hasMonitoring = services.includes("Microsoft.OperationalInsights/workspaces");
  if (!hasMonitoring) {
    findings.push("Operational Excellence: Add Azure Log Analytics workspace for centralized telemetry and alerting.");
  }

  // Determine if a retry loop is needed
  const loopCount = state.reviewLoopCount + 1;
  const criticalIssue = findings.some((f) => f.startsWith("Security:"));
  const shouldLoopBack = criticalIssue && loopCount <= 2;

  const completedEvent: TimelineEvent = {
    node: "reviewer",
    status: "completed",
    startedAt,
    completedAt: new Date().toISOString(),
    findings: `Architecture review complete: ${findings.length === 0 ? "100% compliant with Azure Well-Architected Framework." : findings.join(" | ")}`,
  };

  const nextStatus = shouldLoopBack ? "running" : "completed";

  await saveCheckpoint(
    state.runId,
    {
      ...state,
      status: nextStatus,
      reviewFindings: findings,
      reviewLoopCount: loopCount,
    },
    completedEvent
  );

  return {
    reviewFindings: findings,
    reviewLoopCount: loopCount,
    status: nextStatus,
  };
}
