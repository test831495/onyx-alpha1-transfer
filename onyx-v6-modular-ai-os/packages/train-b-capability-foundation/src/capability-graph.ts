import type { CapabilityDefinition, CapabilityRegistrySnapshot } from "./capability-model";

export const MAX_GRAPH_NODES = 256;
export const MAX_GRAPH_EDGES = 1024;
export const MAX_TRAVERSAL_DEPTH = 64;

export const GRAPH_EDGE_KINDS = [
  "REQUIRES",
  "OPTIONAL_REQUIRES",
  "REFINES",
  "COMPOSES",
  "CONFLICTS_WITH",
  "SUPERSEDES",
  "FALLBACK_TO",
] as const;
export type GraphEdgeKind = (typeof GRAPH_EDGE_KINDS)[number];

const HARD_DEPENDENCY_EDGE_KINDS = new Set<GraphEdgeKind>(["REQUIRES"]);
const OPTIONAL_DEPENDENCY_EDGE_KINDS = new Set<GraphEdgeKind>(["OPTIONAL_REQUIRES"]);
const NON_DEPENDENCY_EDGE_KINDS = new Set<GraphEdgeKind>(["REFINES", "COMPOSES", "CONFLICTS_WITH", "SUPERSEDES", "FALLBACK_TO"]);

export interface CapabilityGraphEdge {
  readonly kind: GraphEdgeKind;
  readonly from: string;
  readonly to: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly reasonCode: string;
}

export interface CapabilityGraph {
  readonly snapshot: CapabilityRegistrySnapshot;
  readonly nodes: readonly string[];
  readonly edges: readonly CapabilityGraphEdge[];
  readonly dependencyClosure: Readonly<Record<string, readonly string[]>>;
  readonly conflicts: readonly string[];
  readonly missingDependencies: readonly string[];
  readonly disabledDependencies: readonly string[];
}

export function createCapabilityGraph(snapshot: CapabilityRegistrySnapshot, edges: readonly CapabilityGraphEdge[]): CapabilityGraph {
  if (snapshot.entries.length > MAX_GRAPH_NODES) {
    throw new TypeError(`Graph exceeds the max node limit: ${snapshot.entries.length} > ${MAX_GRAPH_NODES}`);
  }
  if (edges.length > MAX_GRAPH_EDGES) {
    throw new TypeError(`Graph exceeds the max edge limit: ${edges.length} > ${MAX_GRAPH_EDGES}`);
  }
  const nodes = snapshot.ids;
  const known = new Set(nodes);
  const seen = new Set<string>();
  const validEdges: CapabilityGraphEdge[] = [];

  for (const edge of edges) {
    if (edge.from === edge.to) {
      throw new TypeError(`Self-edge prohibited for ${edge.kind}: ${edge.from}`);
    }
    if (!known.has(edge.from) || !known.has(edge.to)) {
      throw new TypeError(`Graph edge references unknown node: ${edge.from} -> ${edge.to}`);
    }
    const from = snapshot.byId[edge.from];
    const to = snapshot.byId[edge.to];
    if (!from || !to) {
      throw new TypeError(`Graph edge references unknown node: ${edge.from} -> ${edge.to}`);
    }
    if (!from.runtimeEnabled || from.lifecycleState !== "ACTIVE") {
      throw new TypeError(`Graph edge references inactive source capability: ${edge.from}`);
    }
    if (!to.runtimeEnabled || to.lifecycleState !== "ACTIVE") {
      throw new TypeError(`Graph edge references disabled dependency: ${edge.to}`);
    }
    const key = `${edge.kind}:${edge.from}:${edge.to}`;
    if (seen.has(key)) {
      throw new TypeError(`Duplicate edge prohibited: ${key}`);
    }
    seen.add(key);
    validEdges.push(Object.freeze({ ...edge, metadata: edge.metadata ? Object.freeze({ ...edge.metadata }) : undefined }));
  }

  for (const edge of validEdges) {
    if (edge.kind === "REQUIRES") {
      const cycle = detectCycle(validEdges, edge.from, edge.to, new Set([edge.from]));
      if (cycle) throw new TypeError(`Cycle detected in REQUIRES graph: ${cycle}`);
    }
    if (edge.kind === "SUPERSEDES") {
      const cycle = detectCycle(validEdges, edge.from, edge.to, new Set([edge.from]));
      if (cycle) throw new TypeError(`Cycle detected in SUPERSEDES graph: ${cycle}`);
    }
  }

  const optionalEvidence = validEdges.filter((edge) => OPTIONAL_DEPENDENCY_EDGE_KINDS.has(edge.kind));

  const dependencyClosure: Record<string, readonly string[]> = {};
  for (const node of nodes) {
    dependencyClosure[node] = Object.freeze([...collectDependencies(validEdges, node)]);
  }

  const missingDependencies: string[] = [];
  const disabledDependencies: string[] = [];
  const conflicts: string[] = [];

  for (const edge of validEdges) {
    if (edge.kind === "CONFLICTS_WITH") {
      conflicts.push(`${edge.from}->${edge.to}`);
      continue;
    }
    if (!HARD_DEPENDENCY_EDGE_KINDS.has(edge.kind)) {
      continue;
    }
    const from = snapshot.byId[edge.from];
    const to = snapshot.byId[edge.to];
    if (!from || !to) {
      missingDependencies.push(`${edge.from}->${edge.to}`);
      continue;
    }
    if (!to.runtimeEnabled || to.lifecycleState !== "ACTIVE") {
      disabledDependencies.push(`${edge.from}->${edge.to}`);
    }
  }

  if (optionalEvidence.length > 0) {
    // Optional dependency evidence is tracked separately and is intentionally non-blocking.
  }

  return Object.freeze({
    snapshot,
    nodes: Object.freeze([...nodes]),
    edges: Object.freeze(validEdges),
    dependencyClosure: Object.freeze(dependencyClosure),
    conflicts: Object.freeze([...conflicts]),
    missingDependencies: Object.freeze([...missingDependencies]),
    disabledDependencies: Object.freeze([...disabledDependencies]),
  });
}

function collectDependencies(edges: readonly CapabilityGraphEdge[], node: string, seen = new Set<string>(), depth = 0): string[] {
  if (depth > MAX_TRAVERSAL_DEPTH) {
    throw new TypeError(`Traversal exceeds the max dependency depth: ${depth} > ${MAX_TRAVERSAL_DEPTH}`);
  }
  const collected: string[] = [];
  for (const edge of edges) {
    if (!HARD_DEPENDENCY_EDGE_KINDS.has(edge.kind)) continue;
    if (edge.from !== node || seen.has(edge.to)) continue;
    seen.add(edge.to);
    collected.push(edge.to);
    collected.push(...collectDependencies(edges, edge.to, seen, depth + 1));
  }
  return [...new Set(collected)].sort();
}

function detectCycle(edges: readonly CapabilityGraphEdge[], start: string, current: string, visited: Set<string>): string | null {
  if (current === start && visited.size > 1) return `${start}->${current}`;
  for (const edge of edges) {
    if ((edge.kind === "REQUIRES" || edge.kind === "SUPERSEDES") && edge.from === current) {
      if (visited.has(edge.to)) {
        return `${start}->${current}->${edge.to}`;
      }
      const next = new Set(visited);
      next.add(edge.to);
      const result = detectCycle(edges, start, edge.to, next);
      if (result) return result;
    }
  }
  return null;
}

export function dependencyClosure(graph: CapabilityGraph, capabilityId: string): readonly string[] {
  return graph.dependencyClosure[capabilityId] ?? Object.freeze([]);
}
