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

        // 1. Place Houses (Organically along roads)
        const houseCount = Math.floor((w * h) / 100);

        let attempts = 0;
        let placed = 0;
        const MAX_ATTEMPTS = houseCount * 10;

        while (placed < houseCount && attempts < MAX_ATTEMPTS) {
            attempts++;
            const type = rng.nextFloat() > 0.7 ? 'HOUSE_MEDIUM' : 'HOUSE_SMALL'; // More small houses now
            const width = type === 'HOUSE_SMALL' ? 2 : 3;
            const height = 2;

            const x = rng.nextInt(2, w - width - 2);
            const y = rng.nextInt(2, h - height - 2);

            // Avoid Center
            const cx = w / 2, cy = h / 2;
            if (Math.abs(x - cx) < 4 && Math.abs(y - cy) < 4) continue;

            // Check Overlap
            if (this.checkOverlap(x, y, width, height)) continue;

            // Check Water and Mountains (Noise Check)
            let isWaterOrMountain = false;
            let roadScore = 0; // Check proximity to organic roads

            // Scan footprint + margin
            for (let dx = -1; dx <= width + 1; dx++) {
                for (let dy = -1; dy <= height + 1; dy++) {
                    const checkX = x + dx;
                    const checkY = y + dy;

                    const scale = 0.1;
                    const hVal = noise.noise2D(checkX * scale, checkY * scale);
                    if (hVal < 0.2 || hVal > 0.7) { // Too low (water) or too high (mountain)
                        isWaterOrMountain = true;
                        break;
                    }

                    // Is this nearby tile an organic road?
                    const isVerticalRoad = checkX % 10 === 0;
                    const isHorizontalRoad = checkY % 8 === 0;
                    const roadNoise = noise.noise2D(checkX * 0.5, checkY * 0.5);

                    if ((isVerticalRoad || isHorizontalRoad) && roadNoise > 0.3) {
                        // Only score if it's adjacent, not directly ON the road (houses shouldn't block roads)
                        if (dx >= 0 && dx < width && dy >= 0 && dy < height) {
                            isWaterOrMountain = true; // House is IN the road. Invalid.
                            break;
                        } else {
                            roadScore++; // House is NEXT to a road
                        }
                    }
                }
                if (isWaterOrMountain) break;
            }

            // We only place a house if the terrain is valid AND it's near an organic road
            if (isWaterOrMountain || roadScore === 0) continue;

            this.structures.push({
                id: `struct_h_${placed}`,
                type,
                x, y, width, height
            });
            placed++;
        }

        // 2. Place Lamp Posts (Organically along roads)
        const maxLamps = Math.max(3, Math.floor((w * h) / 600));
        let lampCount = 0;
        const potentialSpots: { x: number, y: number, score: number }[] = [];

        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                // Check if it's a valid organic road
                const hVal = noise.noise2D(x * 0.1, y * 0.1);
                if (hVal < 0.2 || hVal > 0.7) continue;

                const isVerticalRoad = x % 10 === 0;
                const isHorizontalRoad = y % 8 === 0;
                const roadNoise = noise.noise2D(x * 0.5, y * 0.5);

                if ((isVerticalRoad || isHorizontalRoad) && roadNoise > 0.3) {
                    let score = 0;
                    for (const s of this.structures) {
                        if (s.type.startsWith('HOUSE')) {
                            const dist = Math.abs(x - s.x) + Math.abs(y - s.y);
                            if (dist < 8) score += (10 - dist); // Closer = better
                        }
                    }

                    if (score > 0) {
                        potentialSpots.push({ x, y, score });
                    }
                }
            }
        }

        potentialSpots.sort((a, b) => b.score - a.score);

        const placedLamps: { x: number, y: number }[] = [];
        const MIN_LAMP_DIST = 15;

        for (const spot of potentialSpots) {
            if (lampCount >= maxLamps) break;

            const tooClose = placedLamps.some(l => (Math.abs(l.x - spot.x) + Math.abs(l.y - spot.y)) < MIN_LAMP_DIST);
            if (tooClose) continue;

            if (this.checkOverlap(spot.x, spot.y, 1, 1)) continue;

            this.structures.push({
                id: `lamp_${spot.x}_${spot.y}`,
                type: 'LAMP_POST',
                x: spot.x, y: spot.y, width: 1, height: 1
            });
            placedLamps.push({ x: spot.x, y: spot.y });
            lampCount++;
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
