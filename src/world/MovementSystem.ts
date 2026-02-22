import { Pathfinding } from './Pathfinding';
import type { Point } from './Pathfinding';
import type { Creature } from './EntityManager';
import { AvatarService } from '../services/AvatarService';

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
    // 1. Build occupancy map (Current and Target tiles)
    const occupied = new Set<string>();
    creatures.forEach(c => {
        // We use Math.round to ensure we are checking grid consistency
        occupied.add(`${Math.round(c.x)},${Math.round(c.y)}`);
        if (c.targetX !== undefined && c.targetY !== undefined) {
            occupied.add(`${c.targetX},${c.targetY}`);
        }
    });

    const isTileBusy = (x: number, y: number, currentX: number, currentY: number) => {
        // Obstacle check (Water, Walls)
        if (checkCollision(x, y)) return true;

        // Other creature check
        const key = `${x},${y}`;
        const currentKey = `${Math.round(currentX)},${Math.round(currentY)}`;
        // If the tile is occupied and it's NOT our current tile, it's busy
        return occupied.has(key) && key !== currentKey;
    };

    // 2. Init or update pathfinder
    if (!pathfinder || lastMapSize !== mapSize) {
        pathfinder = new Pathfinding(mapSize, mapSize, checkCollision);
        lastMapSize = mapSize;
    }

    return creatures.map(c => {
        let creature = { ...c };

        if (!creature.state) creature.state = 'IDLE';
        if (creature.idleTimer === undefined) creature.idleTimer = 0;
        if (!creature.path) creature.path = [];

        // STATE: MOVING
        if (creature.targetX !== undefined && creature.targetY !== undefined) {
            creature.moveProgress += (deltaTime / 1000) * MOVE_SPEED * (creature.speedMultiplier || 1);

            if (creature.moveProgress >= 1) {
                creature.x = creature.targetX;
                creature.y = creature.targetY;
                creature.targetX = undefined;
                creature.targetY = undefined;
                creature.moveProgress = 0;

                if (creature.path && creature.path.length > 0) {
                    const next = creature.path.shift()!;
                    // Check both static collision AND other creatures
                    if (!isTileBusy(next.x, next.y, creature.x, creature.y)) {
                        creature.targetX = next.x;
                        creature.targetY = next.y;
                        creature.state = 'MOVING';

                        // Reserve this tile immediately in our local frame logic 
                        // (though the main 'occupied' set won't update until next frame, 
                        // it helps prevent others from picking it if we were doing this sequentially.
                        // Here we are mapping, so it's parallel-ish in logic.)
                    } else {
                        creature.path = [];
                        creature.state = 'IDLE';
                        creature.idleTimer = 1000;
                        AvatarService.updatePosition(creature.id, creature.x, creature.y);
                    }
                } else {
                    creature.state = 'IDLE';
                    creature.idleTimer = Math.random() * (IDLE_TIME_MAX - IDLE_TIME_MIN) + IDLE_TIME_MIN;
                    AvatarService.updatePosition(creature.id, creature.x, creature.y);
                }
            }
            return creature;
        }

        // STATE: IDLE
        if (creature.state === 'IDLE') {
            if (creature.isPlayer) return creature;

            creature.idleTimer! -= deltaTime;

            if (creature.idleTimer! <= 0) {
                let path: Point[] | null = null;
                let attempts = 0;

                while (!path && attempts < MAX_PATH_ATTEMPTS) {
                    attempts++;
                    const destX = Math.floor(Math.random() * mapSize);
                    const destY = Math.floor(Math.random() * mapSize);

                    const dist = Math.abs(destX - creature.x) + Math.abs(destY - creature.y);
                    if (dist < 5) continue;

                    path = pathfinder!.findPath({ x: creature.x, y: creature.y }, { x: destX, y: destY });
                }

                if (path && path.length > 0) {
                    const first = path.shift()!;
                    // Check if first step is busy
                    if (!isTileBusy(first.x, first.y, creature.x, creature.y)) {
                        creature.path = path;
                        creature.targetX = first.x;
                        creature.targetY = first.y;
                        creature.state = 'MOVING';
                        creature.moveProgress = 0;
                    } else {
                        creature.idleTimer = 1000;
                    }
                } else {
                    creature.idleTimer = 1000;
                }
            }
        }

        return creature;
    });
}
