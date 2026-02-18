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
        for (let r = 0; r <= maxRadius; r++) {
            // Test points in this ring
            // Using a simple square-based ring search
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    // Only test the perimeter of the square for radii > 0
                    if (r > 0 && Math.abs(dx) !== r && Math.abs(dy) !== r) continue;

                    const tx = centerX + dx;
                    const ty = centerY + dy;

                    if (!isBlocked(tx, ty)) {
                        // Found a spot! 
                        // Add a tiny random offset within the tile so they don't stack perfectly
                        return {
                            x: tx + (Math.random() - 0.5) * 0.2,
                            y: ty + (Math.random() - 0.5) * 0.2
                        };
                    }
                }
            }
        }

        // Fallback to absolute center if nothing found (shouldn't happen with large radius)
        return { x: centerX, y: centerY };
    }
}
