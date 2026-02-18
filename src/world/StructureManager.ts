import { RNG } from '../utils/RNG';

export type StructureType = 'HOUSE_SMALL' | 'HOUSE_MEDIUM' | 'FOUNTAIN' | 'LAMP_POST';

export interface Structure {
    id: string;
    type: StructureType;
    x: number; // Grid X
    y: number; // Grid Y
    width: number; // Footprint width
    height: number; // Footprint height (depth)
}

import { Noise } from '../utils/Noise';

export class StructureManager {
    public structures: Structure[] = [];

    constructor(worldWidth: number, worldHeight: number, seed: string) {
        this.generate(worldWidth, worldHeight, seed);
    }

    private generate(w: number, h: number, seedStr: string) {
        // Simple hash of seed string to number
        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);

        const rng = new RNG(seed);
        const noise = new Noise(seed); // Same seed as Terrain
        this.structures = [];

        // 1. Place Houses
        const houseCount = Math.floor((w * h) / 100); // 1 house per 100 tiles roughly

        let attempts = 0;
        let placed = 0;
        const MAX_ATTEMPTS = houseCount * 5;

        while (placed < houseCount && attempts < MAX_ATTEMPTS) {
            attempts++;
            const type = rng.nextFloat() > 0.5 ? 'HOUSE_SMALL' : 'HOUSE_MEDIUM';
            const width = type === 'HOUSE_SMALL' ? 2 : 3;
            const height = 2;

            const x = rng.nextInt(2, w - width - 2);
            const y = rng.nextInt(2, h - height - 2);

            // Avoid Center
            const cx = w / 2, cy = h / 2;
            if (Math.abs(x - cx) < 4 && Math.abs(y - cy) < 4) continue;

            // Check Overlap
            if (this.checkOverlap(x, y, width, height)) continue;

            // Check Water (Noise Check)
            let isWater = false;
            // Scan footprint + margin
            for (let dx = 0; dx < width; dx++) {
                for (let dy = 0; dy < height; dy++) {
                    const scale = 0.1; // MUST match Terrain.ts
                    const hVal = noise.noise2D((x + dx) * scale, (y + dy) * scale);
                    if (hVal < 0.2) { // Water Threshold
                        isWater = true;
                        break;
                    }
                }
                if (isWater) break;
            }

            if (isWater) continue;

            this.structures.push({
                id: `struct_h_${placed}`,
                type,
                x, y, width, height
            });
            placed++;
        }

        // 2. Place Lamp Posts (Deterministic grid walk)
        // Ideally we would check for "Asphalt" tiles, but Terrain is not passed here.
        // We'll simulate a "road grid" here or just place randomly near houses?
        // Let's assume roads are at x%10 === 0 || y%10 === 0 (as per Terrain.ts logic)

        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                // Potential Road
                const isRoad = (x % 10 === 0 || y % 10 === 0);

                if (isRoad) {
                    // Place lamp post every 8 tiles roughly using hash
                    const hash = Math.abs(Math.sin(x * 12.989 + y * 78.233 + seed) * 43758.5453);
                    if ((hash - Math.floor(hash)) > 0.90) { // 10% chance on road
                        // Check overlap
                        if (!this.checkOverlap(x, y, 1, 1)) {
                            // Also check water for lamps? Optional but good.
                            const scale = 0.1;
                            if (noise.noise2D(x * scale, y * scale) < 0.2) continue;

                            this.structures.push({
                                id: `lamp_${x}_${y}`,
                                type: 'LAMP_POST',
                                x, y, width: 1, height: 1
                            });
                        }
                    }
                }
            }
        }
    }

    private checkOverlap(x: number, y: number, w: number, h: number): boolean {
        for (const s of this.structures) {
            if (x < s.x + s.width && x + w > s.x &&
                y < s.y + s.height && y + h > s.y) {
                return true;
            }
        }
        return false;
    }

    public getStructureAt(x: number, y: number): Structure | null {
        return this.structures.find(s =>
            x >= s.x && x < s.x + s.width &&
            y >= s.y && y < s.y + s.height
        ) || null;
    }

    public isBlocked(x: number, y: number): boolean {
        // Check bounds
        // (Assuming world bounds checked elsewhere, but good to be safe if passed w/h)

        // Check structures
        // Simple search (can be optimized with a grid/set if needed)
        for (const s of this.structures) {
            if (s.type === 'LAMP_POST') continue; // Lamp posts might be walkable or small enough? Let's say walkable for now or block? User said "collision with houses".
            // Let's block houses.

            if (x >= s.x && x < s.x + s.width &&
                y >= s.y && y < s.y + s.height) {
                return true;
            }
        }
        return false;
    }
}
