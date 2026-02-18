export interface Point {
    x: number;
    y: number;
}

export class Pathfinding {
    private width: number;
    private height: number;
    private blocked: (x: number, y: number) => boolean;

    constructor(width: number, height: number, blocked: (x: number, y: number) => boolean) {
        this.width = width;
        this.height = height;
        this.blocked = blocked;
    }

    // A* Algorithm
    public findPath(start: Point, end: Point, maxNodes = 1000): Point[] | null {
        // Validation
        if (!this.isValid(start.x, start.y) || !this.isValid(end.x, end.y)) return null;
        if (this.blocked(end.x, end.y)) return null; // Target blocked

        const openSet: Node[] = [];
        const closedSet = new Set<string>();
        const nodeMap = new Map<string, Node>();

        const startNode = new Node(start.x, start.y, 0, this.heuristic(start, end), null);
        openSet.push(startNode);
        nodeMap.set(startNode.key, startNode);

        let nodesExplored = 0;

        while (openSet.length > 0) {
            // Sort by fCost (lowest first) - simple optimization: use min-heap in prod
            openSet.sort((a, b) => a.fCost - b.fCost);
            const current = openSet.shift()!;

            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(current);
            }

            closedSet.add(current.key);
            nodesExplored++;
            if (nodesExplored > maxNodes) return null; // Too expensive

            const neighbors = this.getNeighbors(current);
            for (const neighborPos of neighbors) {
                const key = `${neighborPos.x},${neighborPos.y}`;
                if (closedSet.has(key)) continue;

                // Cost: Base 1, Road 0.6 (TODO: Pass terrain cost function)
                // For now assuming flat cost 1
                const gCost = current.gCost + 1;

                let neighborNode = nodeMap.get(key);
                if (!neighborNode) {
                    neighborNode = new Node(neighborPos.x, neighborPos.y, gCost, this.heuristic(neighborPos, end), current);
                    nodeMap.set(key, neighborNode);
                    openSet.push(neighborNode);
                } else if (gCost < neighborNode.gCost) {
                    neighborNode.gCost = gCost;
                    neighborNode.parent = current;
                }
            }
        }

        return null; // No path found
    }

    private getNeighbors(node: { x: number, y: number }): Point[] {
        const result: Point[] = [];
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // 4-way movement

        for (const [dx, dy] of dirs) {
            const nx = node.x + dx;
            const ny = node.y + dy;
            if (this.isValid(nx, ny) && !this.blocked(nx, ny)) {
                result.push({ x: nx, y: ny });
            }
        }
        return result;
    }

    private isValid(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    private heuristic(a: Point, b: Point): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    private reconstructPath(endNode: Node): Point[] {
        const path: Point[] = [];
        let current: Node | null = endNode;
        while (current) {
            path.push({ x: current.x, y: current.y });
            current = current.parent;
        }
        return path.reverse().slice(1); // Remove start node
    }
}

class Node {
    x: number;
    y: number;
    gCost: number; // Cost from start
    hCost: number; // Heuristic to end
    parent: Node | null;

    constructor(x: number, y: number, gCost: number, hCost: number, parent: Node | null) {
        this.x = x;
        this.y = y;
        this.gCost = gCost;
        this.hCost = hCost;
        this.parent = parent;
    }

    get fCost() { return this.gCost + this.hCost; }
    get key() { return `${this.x},${this.y}`; }
}
