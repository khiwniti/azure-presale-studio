/**
 * Diagram JSON Schema & Integrity Validator.
 * Enforces spec §3 Diagram Model and §4 Diagram Builder validation gate:
 * - Reject unregistered ARM types with exact offending node IDs.
 * - Enforce referential integrity (edges refer to existing nodes, parents to existing groups).
 * - Enforce position coordinates and version numbers.
 */

import { AZURE_SERVICE_REGISTRY } from "./registry";

export interface DiagramAnnotation {
  id: string;
  type: "note" | "tag" | "warning";
  text: string;
}

export interface DiagramNode {
  id: string;
  service: string; // ARM type e.g. "Microsoft.Web/sites"
  label: string;
  parent?: string;
  config?: Record<string, unknown>;
  position: { x: number; y: number };
  annotations?: DiagramAnnotation[];
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: "solid" | "dashed";
}

export interface DiagramGroup {
  id: string;
  kind: "resource-group" | "vnet" | "subnet" | "subscription";
  label: string;
  parent?: string;
}

export interface DiagramJson {
  version: number;
  meta: {
    title: string;
    region: string;
    description?: string;
  };
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
}

export interface ValidationError {
  path: string;
  code: "UNKNOWN_ARM_TYPE" | "INVALID_REFERENCE" | "INVALID_SCHEMA" | "INVALID_POSITION";
  message: string;
  nodeId?: string;
  edgeId?: string;
  groupId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  unknownArmTypes: string[];
}

/**
 * Validates a diagram document against the canonical schema and ARM type registry.
 */
export function validateDiagram(doc: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const unknownArmTypesSet = new Set<string>();

  if (!doc || typeof doc !== "object") {
    return {
      valid: false,
      errors: [
        {
          path: "root",
          code: "INVALID_SCHEMA",
          message: "Diagram must be a non-null object",
        },
      ],
      unknownArmTypes: [],
    };
  }

  const diagram = doc as Partial<DiagramJson>;

  // 1. Version check
  if (diagram.version !== 1) {
    errors.push({
      path: "version",
      code: "INVALID_SCHEMA",
      message: `Unsupported diagram version: ${diagram.version}. Expected version 1.`,
    });
  }

  // 2. Meta check
  if (!diagram.meta || typeof diagram.meta !== "object") {
    errors.push({
      path: "meta",
      code: "INVALID_SCHEMA",
      message: "Missing 'meta' object with title and region.",
    });
  } else {
    if (!diagram.meta.title || typeof diagram.meta.title !== "string") {
      errors.push({
        path: "meta.title",
        code: "INVALID_SCHEMA",
        message: "Meta title must be a non-empty string.",
      });
    }
    if (!diagram.meta.region || typeof diagram.meta.region !== "string") {
      errors.push({
        path: "meta.region",
        code: "INVALID_SCHEMA",
        message: "Meta region must be a non-empty Azure region string.",
      });
    }
  }

  // 3. Groups validation & lookup set
  const groupIds = new Set<string>();
  if (!Array.isArray(diagram.groups)) {
    errors.push({
      path: "groups",
      code: "INVALID_SCHEMA",
      message: "Diagram 'groups' must be an array.",
    });
  } else {
    for (let i = 0; i < diagram.groups.length; i++) {
      const g = diagram.groups[i] as Partial<DiagramGroup>;
      if (!g || !g.id || typeof g.id !== "string") {
        errors.push({
          path: `groups[${i}].id`,
          code: "INVALID_SCHEMA",
          message: "Group missing valid 'id'.",
        });
        continue;
      }
      if (groupIds.has(g.id)) {
        errors.push({
          path: `groups[${i}].id`,
          code: "INVALID_SCHEMA",
          groupId: g.id,
          message: `Duplicate group id: '${g.id}'.`,
        });
      }
      groupIds.add(g.id);

      const validKinds = ["resource-group", "vnet", "subnet", "subscription"];
      if (!g.kind || !validKinds.includes(g.kind)) {
        errors.push({
          path: `groups[${i}].kind`,
          code: "INVALID_SCHEMA",
          groupId: g.id,
          message: `Group '${g.id}' has invalid kind '${g.kind}'. Must be one of: ${validKinds.join(", ")}`,
        });
      }
    }
  }

  // 4. Nodes validation & lookup set
  const nodeIds = new Set<string>();
  if (!Array.isArray(diagram.nodes)) {
    errors.push({
      path: "nodes",
      code: "INVALID_SCHEMA",
      message: "Diagram 'nodes' must be an array.",
    });
  } else {
    for (let i = 0; i < diagram.nodes.length; i++) {
      const n = diagram.nodes[i] as Partial<DiagramNode>;
      if (!n || !n.id || typeof n.id !== "string") {
        errors.push({
          path: `nodes[${i}].id`,
          code: "INVALID_SCHEMA",
          message: "Node missing valid 'id'.",
        });
        continue;
      }

      if (nodeIds.has(n.id)) {
        errors.push({
          path: `nodes[${i}].id`,
          code: "INVALID_SCHEMA",
          nodeId: n.id,
          message: `Duplicate node id: '${n.id}'.`,
        });
      }
      nodeIds.add(n.id);

      // ARM service type validation against official registry
      if (!n.service || typeof n.service !== "string") {
        errors.push({
          path: `nodes[${i}].service`,
          code: "INVALID_SCHEMA",
          nodeId: n.id,
          message: `Node '${n.id}' is missing 'service' ARM type.`,
        });
      } else if (!AZURE_SERVICE_REGISTRY[n.service]) {
        unknownArmTypesSet.add(n.service);
        errors.push({
          path: `nodes[${i}].service`,
          code: "UNKNOWN_ARM_TYPE",
          nodeId: n.id,
          message: `Node '${n.id}' uses unknown or non-official ARM type '${n.service}'.`,
        });
      }

      // Group hierarchy check
      if (n.parent && !groupIds.has(n.parent)) {
        errors.push({
          path: `nodes[${i}].parent`,
          code: "INVALID_REFERENCE",
          nodeId: n.id,
          message: `Node '${n.id}' references non-existent parent group '${n.parent}'.`,
        });
      }

      // Position check
      if (
        !n.position ||
        typeof n.position.x !== "number" ||
        typeof n.position.y !== "number" ||
        Number.isNaN(n.position.x) ||
        Number.isNaN(n.position.y)
      ) {
        errors.push({
          path: `nodes[${i}].position`,
          code: "INVALID_POSITION",
          nodeId: n.id,
          message: `Node '${n.id}' must specify numeric x and y position coordinates.`,
        });
      }
    }
  }

  // 5. Edges validation
  if (!Array.isArray(diagram.edges)) {
    errors.push({
      path: "edges",
      code: "INVALID_SCHEMA",
      message: "Diagram 'edges' must be an array.",
    });
  } else {
    for (let i = 0; i < diagram.edges.length; i++) {
      const e = diagram.edges[i] as Partial<DiagramEdge>;
      if (!e || !e.id || typeof e.id !== "string") {
        errors.push({
          path: `edges[${i}].id`,
          code: "INVALID_SCHEMA",
          message: "Edge missing valid 'id'.",
        });
        continue;
      }
      if (!e.from || !nodeIds.has(e.from)) {
        errors.push({
          path: `edges[${i}].from`,
          code: "INVALID_REFERENCE",
          edgeId: e.id,
          message: `Edge '${e.id}' references non-existent source node '${e.from}'.`,
        });
      }
      if (!e.to || !nodeIds.has(e.to)) {
        errors.push({
          path: `edges[${i}].to`,
          code: "INVALID_REFERENCE",
          edgeId: e.id,
          message: `Edge '${e.id}' references non-existent target node '${e.to}'.`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    unknownArmTypes: Array.from(unknownArmTypesSet),
  };
}
