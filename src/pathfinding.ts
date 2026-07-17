import type { Vec } from "./types";

interface PathfindingOptions {
  start: Vec;
  goal: Vec;
  width: number;
  height: number;
  cellSize: number;
  isWalkable: (point: Vec) => boolean;
  canTraverse: (from: Vec, to: Vec) => boolean;
  maxVisited?: number;
}

interface OpenNode {
  key: string;
  x: number;
  y: number;
  g: number;
  f: number;
}

class MinHeap {
  private nodes: OpenNode[] = [];

  get length() { return this.nodes.length; }

  push(node: OpenNode) {
    this.nodes.push(node);
    let index = this.nodes.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.nodes[parent].f <= node.f) break;
      this.nodes[index] = this.nodes[parent];
      index = parent;
    }
    this.nodes[index] = node;
  }

  pop() {
    const root = this.nodes[0];
    const tail = this.nodes.pop();
    if (!tail || !this.nodes.length) return root;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= this.nodes.length) break;
      const right = left + 1;
      const child = right < this.nodes.length && this.nodes[right].f < this.nodes[left].f ? right : left;
      if (this.nodes[child].f >= tail.f) break;
      this.nodes[index] = this.nodes[child];
      index = child;
    }
    this.nodes[index] = tail;
    return root;
  }
}

const NEIGHBORS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
] as const;

/** A* on a collision-tested navigation grid. Returns exact start/goal endpoints. */
export function findGridPath(options: PathfindingOptions): Vec[] | null {
  const { start, goal, width, height, cellSize, isWalkable, canTraverse } = options;
  if (canTraverse(start, goal)) return [{ ...start }, { ...goal }];

  const columns = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const pointFor = (x: number, y: number): Vec => ({
    x: Math.min(width, x * cellSize + cellSize / 2),
    y: Math.min(height, y * cellSize + cellSize / 2),
  });
  const keyFor = (x: number, y: number) => `${x},${y}`;
  const parseKey = (key: string) => key.split(",").map(Number) as [number, number];

  const nearbyNodes = (point: Vec) => {
    const centerX = Math.floor(point.x / cellSize);
    const centerY = Math.floor(point.y / cellSize);
    const candidates: { x: number; y: number; point: Vec; distance: number }[] = [];
    for (let radius = 0; radius <= 3; radius++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
          if (x < 0 || y < 0 || x >= columns || y >= rows) continue;
          if (radius > 0 && Math.abs(x - centerX) < radius && Math.abs(y - centerY) < radius) continue;
          const candidate = pointFor(x, y);
          if (!isWalkable(candidate) || !canTraverse(point, candidate)) continue;
          candidates.push({ x, y, point: candidate, distance: Math.hypot(candidate.x - point.x, candidate.y - point.y) });
        }
      }
      if (candidates.length >= 4) break;
    }
    return candidates.sort((a, b) => a.distance - b.distance).slice(0, 8);
  };

  const starts = nearbyNodes(start);
  const goals = nearbyNodes(goal);
  if (!starts.length || !goals.length) return null;

  const goalKeys = new Set(goals.map((node) => keyFor(node.x, node.y)));
  const heuristic = (point: Vec) => Math.hypot(point.x - goal.x, point.y - goal.y);
  const open = new MinHeap();
  const costs = new Map<string, number>();
  const parents = new Map<string, string>();
  const closed = new Set<string>();

  for (const node of starts) {
    const key = keyFor(node.x, node.y);
    if ((costs.get(key) ?? Infinity) <= node.distance) continue;
    costs.set(key, node.distance);
    open.push({ key, x: node.x, y: node.y, g: node.distance, f: node.distance + heuristic(node.point) });
  }

  let reached: string | null = null;
  let visited = 0;
  const maxVisited = options.maxVisited ?? columns * rows;
  while (open.length && visited < maxVisited) {
    const current = open.pop()!;
    if (closed.has(current.key)) continue;
    closed.add(current.key);
    visited++;
    if (goalKeys.has(current.key)) { reached = current.key; break; }

    const currentPoint = pointFor(current.x, current.y);
    for (const [dx, dy] of NEIGHBORS) {
      const x = current.x + dx, y = current.y + dy;
      if (x < 0 || y < 0 || x >= columns || y >= rows) continue;
      const key = keyFor(x, y);
      if (closed.has(key)) continue;
      const point = pointFor(x, y);
      if (!isWalkable(point) || !canTraverse(currentPoint, point)) continue;
      const nextCost = current.g + Math.hypot(dx, dy) * cellSize;
      if (nextCost >= (costs.get(key) ?? Infinity)) continue;
      costs.set(key, nextCost);
      parents.set(key, current.key);
      open.push({ key, x, y, g: nextCost, f: nextCost + heuristic(point) });
    }
  }

  if (!reached) return null;
  const reversed: Vec[] = [];
  let key: string | undefined = reached;
  while (key) {
    const [x, y] = parseKey(key);
    reversed.push(pointFor(x, y));
    key = parents.get(key);
  }
  reversed.reverse();
  return [{ ...start }, ...reversed, { ...goal }];
}
