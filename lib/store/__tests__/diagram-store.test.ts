import { describe, it, expect, beforeEach } from "vitest";
import { useDiagramStore } from "@/lib/store/diagram-store";
import type { DiagramJson } from "@/mcp/azure-diagram/validator";

describe("Diagram State Store", () => {
  beforeEach(() => {
    useDiagramStore.setState({
      diagramJson: null,
      nodes: [],
      edges: [],
      history: [],
      historyIndex: -1,
    });
  });

  it("initializes with empty state", () => {
    const state = useDiagramStore.getState();
    expect(state.diagramJson).toBeNull();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.history).toEqual([]);
    expect(state.historyIndex).toBe(-1);
  });

  it("sets diagram JSON and initializes history", () => {
    const diagram: DiagramJson = {
      version: 1,
      meta: { title: "Test", region: "eastus", description: "" },
      groups: [],
      nodes: [],
      edges: [],
    };

    useDiagramStore.getState().setDiagramJson(diagram);

    const state = useDiagramStore.getState();
    expect(state.diagramJson).toEqual(diagram);
    expect(state.history).toEqual([diagram]);
    expect(state.historyIndex).toBe(0);
  });

  it("applies SSE patch to replace node label", () => {
    const diagram: DiagramJson = {
      version: 1,
      meta: { title: "Test", region: "eastus", description: "" },
      groups: [],
      nodes: [
        {
          id: "node1",
          service: "Microsoft.Web/sites",
          label: "Old Label",
          position: { x: 0, y: 0 },
          config: {},
          annotations: [],
        },
      ],
      edges: [],
    };

    useDiagramStore.getState().setDiagramJson(diagram);
    useDiagramStore.getState().applySSEPatch({
      op: "replace",
      path: "/nodes/0/label",
      value: "New Label",
    });

    const state = useDiagramStore.getState();
    expect(state.diagramJson?.nodes[0]?.label).toBe("New Label");
  });

  it("applies SSE patch to add node", () => {
    const diagram: DiagramJson = {
      version: 1,
      meta: { title: "Test", region: "eastus", description: "" },
      groups: [],
      nodes: [],
      edges: [],
    };

    useDiagramStore.getState().setDiagramJson(diagram);
    useDiagramStore.getState().applySSEPatch({
      op: "add",
      path: "/nodes/-",
      value: {
        id: "node1",
        service: "Microsoft.Web/sites",
        label: "Test",
        parent: null,
        position: { x: 0, y: 0 },
        config: {},
        annotations: [],
      },
    });

    const state = useDiagramStore.getState();
    expect(state.diagramJson?.nodes).toHaveLength(1);
    expect(state.diagramJson?.nodes[0]?.id).toBe("node1");
  });

  it("applies SSE patch to remove node", () => {
    const diagram: DiagramJson = {
      version: 1,
      meta: { title: "Test", region: "eastus", description: "" },
      groups: [],
      nodes: [
        {
          id: "node1",
          service: "Microsoft.Web/sites",
          label: "Test",
          position: { x: 0, y: 0 },
          config: {},
          annotations: [],
        },
      ],
      edges: [],
    };

    useDiagramStore.getState().setDiagramJson(diagram);
    useDiagramStore.getState().applySSEPatch({
      op: "remove",
      path: "/nodes/0",
    });

    const state = useDiagramStore.getState();
    expect(state.diagramJson?.nodes).toHaveLength(0);
  });

  it("saves checkpoint and manages history stack", () => {
    const diagram: DiagramJson = {
      version: 1,
      meta: { title: "Test", region: "eastus", description: "" },
      groups: [],
      nodes: [],
      edges: [],
    };

    useDiagramStore.getState().setDiagramJson(diagram);
    useDiagramStore.getState().saveCheckpoint();

    const state = useDiagramStore.getState();
    expect(state.history).toHaveLength(2);
    expect(state.historyIndex).toBe(1);
  });

  it("undoes to previous checkpoint", () => {
    const diagram: DiagramJson = {
      version: 1,
      meta: { title: "Test1", region: "eastus", description: "" },
      groups: [],
      nodes: [],
      edges: [],
    };

    useDiagramStore.getState().setDiagramJson(diagram);

    // Mutate the diagram
    useDiagramStore.getState().applySSEPatch({
      op: "replace",
      path: "/meta/title",
      value: "Test2",
    });
    useDiagramStore.getState().saveCheckpoint();

    useDiagramStore.getState().undo();

    const state = useDiagramStore.getState();
    expect(state.diagramJson?.meta.title).toBe("Test1");
    expect(state.historyIndex).toBe(0);
  });

  it("redoes to next checkpoint", () => {
    const diagram: DiagramJson = {
      version: 1,
      meta: { title: "Test1", region: "eastus", description: "" },
      groups: [],
      nodes: [],
      edges: [],
    };

    useDiagramStore.getState().setDiagramJson(diagram);

    // Mutate the diagram
    useDiagramStore.getState().applySSEPatch({
      op: "replace",
      path: "/meta/title",
      value: "Test2",
    });
    useDiagramStore.getState().saveCheckpoint();

    useDiagramStore.getState().undo();
    useDiagramStore.getState().redo();

    const state = useDiagramStore.getState();
    expect(state.diagramJson?.meta.title).toBe("Test2");
    expect(state.historyIndex).toBe(1);
  });

  it("limits history to 50 checkpoints", () => {
    const diagram: DiagramJson = {
      version: 1,
      meta: { title: "Test", region: "eastus", description: "" },
      groups: [],
      nodes: [],
      edges: [],
    };

    useDiagramStore.getState().setDiagramJson(diagram);

    for (let i = 0; i < 55; i++) {
      useDiagramStore.getState().saveCheckpoint();
    }

    const state = useDiagramStore.getState();
    expect(state.history.length).toBeLessThanOrEqual(50);
  });
});
