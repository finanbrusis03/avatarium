import { Terrain } from './Terrain';
import { StructureManager } from './StructureManager';
import type { WorldConfig } from '../services/WorldConfigService';

export class SpawnManager {
    public static findValidSpawnPoint(config: WorldConfig): { x: number, y: number } {
        const centerX = Math.floor(config.width / 2);
        const centerY = Math.floor(config.height / 2);

        // Instantiate terrain and structures to check collisions
        const terrain = new Terrain(config.width, config.height, config.seed);
        const structures = new StructureManager(config.width, config.height, config.seed);

        const isBlocked = (x: number, y: number) => {
            if (x < 0 || x >= config.width || y < 0 || y >= config.height) return true;
            if (terrain.getTile(x, y) === 'WATER') return true;
            if (structures.isBlocked(x, y)) return true;
            return false;
        };

        // Spiral/Ring search
        const maxRadius = 30;
        const validPoints: { x: number, y: number }[] = [];

        // Strategy: Collection valid points in small increments of radius
        // Once we find enough points (e.g., 5-10), we pick one.
        for (let r = 0; r <= maxRadius; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (r > 0 && Math.abs(dx) !== r && Math.abs(dy) !== r) continue;

                    const tx = centerX + dx;
                    const ty = centerY + dy;

                    if (!isBlocked(tx, ty)) {
                        validPoints.push({ x: tx, y: ty });
                    }
                }
            }

            // If we found at least 10 valid points, or we are at radius 3, pick a random one
            if (validPoints.length >= 10 || r >= 3) {
                if (validPoints.length > 0) {
                    return validPoints[Math.floor(Math.random() * validPoints.length)];
                }
            }
        }

        // Fallback to absolute center if nothing found (shouldn't happen with large radius)
        return { x: centerX, y: centerY };
    }
}
