import { Pathfinding } from './Pathfinding';
import type { Point } from './Pathfinding';
import type { Creature } from './EntityManager';

// Callback type for collision
type CollisionCheck = (x: number, y: number) => boolean;

const MOVE_SPEED = 1.5; // Tiles per second (slower, more natural)
const IDLE_TIME_MIN = 1000;
const IDLE_TIME_MAX = 4000;

// Config
const MAX_PATH_ATTEMPTS = 5;

let pathfinder: Pathfinding | null = null;
let lastMapSize = 0;

export function updateCreatures(creatures: Creature[], deltaTime: number, mapSize: number, checkCollision: CollisionCheck): Creature[] {
    // Init or update pathfinder if map size changes
    // Ideally we pass mapSize or pathfinder instance, but lazy init here works for now.
    // For robust production code, pass Pathfinder instance in arguments.
    if (!pathfinder || lastMapSize !== mapSize) {
        pathfinder = new Pathfinding(mapSize, mapSize, checkCollision);
        lastMapSize = mapSize;
    }

    return creatures.map(c => {
        let creature = { ...c };

        // Initialize state defaults
        if (!creature.state) creature.state = 'IDLE';
        if (creature.idleTimer === undefined) creature.idleTimer = 0;
        if (!creature.path) creature.path = [];

        // STATE: MOVING (Inter-tile interpolation)
        if (creature.targetX !== undefined && creature.targetY !== undefined) {
            creature.moveProgress += (deltaTime / 1000) * MOVE_SPEED;

            if (creature.moveProgress >= 1) {
                // Arrived at immediate grid cell
                creature.x = creature.targetX;
                creature.y = creature.targetY;
                creature.targetX = undefined;
                creature.targetY = undefined;
                creature.moveProgress = 0;

                // Continue path if available
                if (creature.path && creature.path.length > 0) {
                    const next = creature.path.shift()!;
                    // Verify next step is still valid (not blocked by sudden obstacle)
                    if (!checkCollision(next.x, next.y)) {
                        creature.targetX = next.x;
                        creature.targetY = next.y;
                        creature.state = 'MOVING';
                    } else {
                        // Blocked! Abort path and go idle to rethink.
                        creature.path = [];
                        creature.state = 'IDLE';
                        creature.idleTimer = 500; // Brief pause
                    }
                } else {
                    // Path finished
                    creature.state = 'IDLE';
                    creature.idleTimer = Math.random() * (IDLE_TIME_MAX - IDLE_TIME_MIN) + IDLE_TIME_MIN;
                }
            }
            return creature;
        }

        // STATE: IDLE (Thinking)
        if (creature.state === 'IDLE') {
            // Player avatars do NOT auto-move
            if (creature.isPlayer) {
                return creature;
            }

            creature.idleTimer! -= deltaTime;

            if (creature.idleTimer! <= 0) {
                // Time to move!
                // Pick a long-range destination
                let path: Point[] | null = null;
                let attempts = 0;

                // Try to find a valid path to a random distant point
                while (!path && attempts < MAX_PATH_ATTEMPTS) {
                    attempts++;
                    const destX = Math.floor(Math.random() * mapSize);
                    const destY = Math.floor(Math.random() * mapSize);

                    // Min distance check (avoid micro-moves)
                    const dist = Math.abs(destX - creature.x) + Math.abs(destY - creature.y);
                    if (dist < 5) continue; // Too close

                    // Calculate Path
                    path = pathfinder!.findPath({ x: creature.x, y: creature.y }, { x: destX, y: destY });
                }

                if (path && path.length > 0) {
                    creature.path = path;
                    const first = creature.path.shift()!;
                    creature.targetX = first.x;
                    creature.targetY = first.y;
                    creature.state = 'MOVING';
                    creature.moveProgress = 0;
                } else {
                    // Failed to find path, wait a bit
                    creature.idleTimer = 1000;
                }
            }
        }

        return creature;
    });
}
