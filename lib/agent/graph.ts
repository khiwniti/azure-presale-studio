/**
 * LangGraph.js Agent Graph Engine.
 * Top-level StateGraph wiring using LangGraph Annotation.Root:
 *   supervisor -> researcher -> architect -> diagram_builder -> reviewer -> END
 *
 * Spec §2 & §4: Agent Graph Topology and Lifecycle.
 */

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { DiagramJson, ValidationError } from "@/mcp/azure-diagram/validator";
import { architectNode } from "./nodes/architect";
import { diagramBuilderNode } from "./nodes/diagram-builder";
import { researcherNode } from "./nodes/researcher";
import { reviewerNode } from "./nodes/reviewer";
import { supervisorNode } from "./nodes/supervisor";
import type { AgentGraphState, ArchitectureDecisionRecord, ResearchBrief, TimelineEvent } from "./types";

export const AgentStateAnnotation = Annotation.Root({
  runId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  canvasId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  sessionId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  prompt: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  intent: Annotation<"generate" | "edit" | "clarify">({
    reducer: (_, next) => next,
    default: () => "generate",
  }),
  model: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "nvidia/llama-3.1-nemotron-70b-instruct",
  }),
  researchBrief: Annotation<ResearchBrief | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  adr: Annotation<ArchitectureDecisionRecord | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  diagram: Annotation<DiagramJson | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  validationErrors: Annotation<ValidationError[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  builderRetryCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  reviewFindings: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  reviewLoopCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  timeline: Annotation<TimelineEvent[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  status: Annotation<"running" | "completed" | "failed">({
    reducer: (_, next) => next,
    default: () => "running",
  }),
  error: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
});

/**
 * Build the executable StateGraph for architecture generation.
 */
export function buildArchitectureGraph() {
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode("supervisor", supervisorNode)
    .addNode("researcher", researcherNode)
    .addNode("architect", architectNode)
    .addNode("diagram_builder", diagramBuilderNode)
    .addNode("reviewer", reviewerNode)

    .addEdge(START, "supervisor")
    .addConditionalEdges("supervisor", (state: AgentGraphState) => {
      return state.intent === "edit" ? "architect" : "researcher";
    })
    .addEdge("researcher", "architect")
    .addEdge("architect", "diagram_builder")
    .addConditionalEdges("diagram_builder", (state: AgentGraphState) => {
      if (state.validationErrors.length > 0 && state.builderRetryCount <= 1) {
        return "architect";
      }
      return "reviewer";
    })
    .addConditionalEdges("reviewer", (state: AgentGraphState) => {
      if (state.status === "running" && state.reviewLoopCount <= 2) {
        return "architect";
      }
      return END;
    });

  return workflow.compile();
}
