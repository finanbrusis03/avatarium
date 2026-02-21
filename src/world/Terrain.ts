import { Noise } from '../utils/Noise';
import { isoToScreen, TILE_WIDTH, TILE_HEIGHT } from '../engine/IsoMath';

export type TileType = 'WATER' | 'SAND' | 'GRASS' | 'DIRT' | 'STONE' | 'SNOW' | 'ASPHALT';

export interface Prop {
    type: 'TREE' | 'BUSH' | 'ROCK' | 'FLOWER' | 'BONFIRE';
    x: number;
    y: number;
    variant: number;
}

export class Terrain {
    public width: number;
    public height: number;
    private tiles: Uint8Array;
    private props: Map<string, Prop> = new Map();
    private noise: Noise;

    private static TILE_TYPES: TileType[] = ['WATER', 'SAND', 'GRASS', 'DIRT', 'STONE', 'SNOW', 'ASPHALT'];

    constructor(width: number, height: number, seedStr: string) {
        this.width = width;
        this.height = height;
        this.tiles = new Uint8Array(width * height);

        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
        this.noise = new Noise(seed);

        this.generate(seed);
    }

    private generate(seed: number) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const scale = 0.1;
                const h = this.noise.noise2D(x * scale, y * scale);

                let typeIdx = 2; // Grass

                if (h < 0.2) typeIdx = 0; // Water
                else if (h < 0.25) typeIdx = 1; // Sand
                else if (h < 0.55) typeIdx = 2; // Grass
                else if (h < 0.70) typeIdx = 3; // Dirt
                else if (h < 0.85) typeIdx = 4; // Stone
                else typeIdx = 5; // Snow
                // Organic Meandering Roads
                const isVerticalRoad = x % 10 === 0 && h > 0.1 && h < 0.7; // Avoid high mountais for roads
                const isHorizontalRoad = y % 8 === 0 && h > 0.1 && h < 0.7;

                // Add noise disruption to roads so they aren't perfect grids
                const roadNoise = this.noise.noise2D(x * 0.5, y * 0.5);

                if ((isVerticalRoad || isHorizontalRoad) && typeIdx !== 0 && typeIdx !== 1) { // Not on water/sand
                    if (roadNoise > 0.3) {
                        typeIdx = 6; // Asphalt
                    }
                }

                this.tiles[y * this.width + x] = typeIdx;

                // Props
                if (typeIdx === 2 || typeIdx === 3) {
                    const propHash = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
                    const val = propHash - Math.floor(propHash);

                    if (val > 0.92) {
                        this.props.set(`${x},${y}`, {
                            type: val > 0.97 ? 'TREE' : 'BUSH',
                            x, y, variant: Math.floor(val * 100) % 3
                        });
                    }
                }
            }
        }
    }

    public getTile(x: number, y: number): TileType {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 'WATER';
        return Terrain.TILE_TYPES[this.tiles[y * this.width + x]];
    }

    public getPropAt(x: number, y: number): Prop | undefined {
        return this.props.get(`${x},${y}`);
    }

    public getTileColor(type: TileType): string {
        switch (type) {
            case 'WATER': return '#1E88E5'; // Changed to brighter blue for base
            case 'SAND': return '#FBC02D';
            case 'DIRT': return '#5D4037';
            case 'STONE': return '#616161';
            case 'SNOW': return '#BDBDBD';
            case 'ASPHALT': return '#37474F';
            case 'GRASS': return '#4CAF50';
        }
        return '#000';
    }

    public getTileTopColor(type: TileType): string {
        switch (type) {
            case 'WATER': return '#42A5F5';
            case 'SAND': return '#FFEE58';
            case 'DIRT': return '#795548';
            case 'STONE': return '#757575';
            case 'SNOW': return '#E0E0E0';
            case 'ASPHALT': return '#455A64';
            case 'GRASS': return '#66BB6A';
        }
        return '#000';
    }

    public drawFullTerrain(ctx: CanvasRenderingContext2D, startX: number, endX: number, startY: number, endY: number, time: number = 0) {
        // Pass 0: Base Diamonds (Background Fallback, skip WATER so it has no hard square edges)
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const type = this.getTile(x, y);
                // Do not draw square bases for water, water must be purely organic ellipses
                if (type !== 'WATER') {
                    const p = isoToScreen(x, y);
                    ctx.fillStyle = this.getTileColor(type);
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y - TILE_HEIGHT / 2);
                    ctx.lineTo(p.x + TILE_WIDTH / 2, p.y);
                    ctx.lineTo(p.x, p.y + TILE_HEIGHT / 2);
                    ctx.lineTo(p.x - TILE_WIDTH / 2, p.y);
                    ctx.fill();
                }
            }
        }

        // Pass 1: Organic Biome Splats (Water -> Sand -> Dirt -> Grass -> Stone)
        // WATER is first. It draws an oversized ellipse that smooths out the world border.
        // Overlapping sand/grass will "eat" the water's inner corners creating organic beaches, 
        // while the outer black canvas border gets rounded off by the water ellipse.
        const organicOrder: TileType[] = ['WATER', 'SAND', 'DIRT', 'GRASS', 'STONE'];
        for (const targetType of organicOrder) {
            for (let x = startX; x <= endX; x++) {
                for (let y = startY; y <= endY; y++) {
                    if (this.getTile(x, y) === targetType) {
                        const p = isoToScreen(x, y);

                        if (targetType === 'WATER') {
                            const grad = ctx.createLinearGradient(p.x, p.y - TILE_HEIGHT / 2, p.x, p.y + TILE_HEIGHT / 2);
                            grad.addColorStop(0, '#00BFFF'); // Bright Cyan Top
                            grad.addColorStop(1, '#0277BD'); // Deep Ocean Blue Bottom
                            ctx.fillStyle = grad;
                            ctx.beginPath();
                            ctx.ellipse(p.x, p.y, (TILE_WIDTH / 2) * 1.35, (TILE_HEIGHT / 2) * 1.35, 0, 0, Math.PI * 2);
                            ctx.fill();
                        } else {
                            ctx.fillStyle = this.getTileColor(targetType);
                            ctx.beginPath();
                            ctx.ellipse(p.x, p.y, (TILE_WIDTH / 2) * 1.35, (TILE_HEIGHT / 2) * 1.35, 0, 0, Math.PI * 2);
                            ctx.fill();

                            // Remove any accidental stroke lines from previous iterations
                            ctx.strokeStyle = 'transparent';
                            ctx.lineWidth = 0;
                        }
                    }
                }
            }
        }

        // Pass 2: Natural Textures (Waves, Tufts, Pebbles)
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const type = this.getTile(x, y);
                const p = isoToScreen(x, y);

                ctx.save();
                const seed = x * 13.513 + y * 71.93;

                if (type === 'GRASS') {
                    ctx.fillStyle = '#4CAF50';
                    ctx.globalAlpha = 0.8;
                    ctx.beginPath();
                    for (let i = 0; i < 4; i++) {
                        const rx = p.x - (TILE_WIDTH * 0.3) + (Math.sin(seed + i * 1.1) * 0.5 + 0.5) * (TILE_WIDTH * 0.6);
                        const ry = p.y - (TILE_HEIGHT * 0.3) + (Math.cos(seed + i * 2.2) * 0.5 + 0.5) * (TILE_HEIGHT * 0.6);
                        ctx.moveTo(rx, ry);
                        ctx.arc(rx, ry, 2 + (i % 2), 0, Math.PI * 2);
                    }
                    ctx.fill();
                } else if (type === 'DIRT') {
                    ctx.fillStyle = '#4E342E';
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    for (let i = 0; i < 4; i++) {
                        const rx = p.x - (TILE_WIDTH * 0.3) + (Math.sin(seed * (i + 1) + 1.1) * 0.5 + 0.5) * (TILE_WIDTH * 0.6);
                        const ry = p.y - (TILE_HEIGHT * 0.3) + (Math.cos(seed * (i + 2) + 2.2) * 0.5 + 0.5) * (TILE_HEIGHT * 0.6);
                        ctx.moveTo(rx, ry);
                        ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
                    }
                    ctx.fill();
                } else if (type === 'SAND') {
                    ctx.fillStyle = '#FBC02D';
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const rx = p.x - (TILE_WIDTH * 0.3) + (Math.sin(seed * i + 3.3) * 0.5 + 0.5) * (TILE_WIDTH * 0.6);
                        const ry = p.y - (TILE_HEIGHT * 0.3) + (Math.cos(seed * i + 4.4) * 0.5 + 0.5) * (TILE_HEIGHT * 0.6);
                        ctx.moveTo(rx, ry);
                        ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
                    }
                    ctx.fill();
                } else if (type === 'WATER') {
                    // Liquid animated shimmering ripples (curved bezier paths instead of straight lines)
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.lineCap = 'round';
                    ctx.lineWidth = 1.8;

                    const animSpeed = 0.002;
                    const wave1 = Math.sin(time * animSpeed + seed) * 0.5 + 0.5;
                    const wave2 = Math.cos(time * animSpeed * 1.3 + seed * 2) * 0.5 + 0.5;

                    const widthBase = TILE_WIDTH / 3;

                    // Ripple 1
                    const lineY1 = p.y - TILE_HEIGHT / 5 + wave1 * 6;
                    ctx.beginPath();
                    ctx.moveTo(p.x - widthBase, lineY1);
                    ctx.quadraticCurveTo(p.x, lineY1 + 3, p.x + widthBase, lineY1);
                    ctx.stroke();

                    // Ripple 2
                    const lineY2 = p.y + TILE_HEIGHT / 5 - wave2 * 6;
                    ctx.beginPath();
                    ctx.moveTo(p.x - widthBase * 1.2, lineY2);
                    ctx.quadraticCurveTo(p.x, lineY2 - 3, p.x + widthBase * 1.2, lineY2);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // Pass 3: Human Raised Terrain (Asphalt)
        const raisedTiles: { x: number, y: number, type: TileType, depth: number }[] = [];
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const type = this.getTile(x, y);
                if (type === 'ASPHALT') {
                    raisedTiles.push({ x, y, type, depth: x + y });
                }
            }
        }

        raisedTiles.sort((a, b) => a.depth - b.depth);

        for (const t of raisedTiles) {
            const p = isoToScreen(t.x, t.y);

            if (t.type === 'ASPHALT') {
                // Asphalt is a flat terrain feature, drawn on top like an organic splat
                ctx.fillStyle = this.getTileTopColor('ASPHALT');
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, (TILE_WIDTH / 2) * 1.35, (TILE_HEIGHT / 2) * 1.35, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw Road Markings
            if (t.type === 'ASPHALT') {
                const tTop = this.getTile(t.x, t.y - 1);
                const tRight = this.getTile(t.x + 1, t.y);
                const tBottom = this.getTile(t.x, t.y + 1);
                const tLeft = this.getTile(t.x - 1, t.y);

                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]); // Dashed
                ctx.beginPath();

                // Horizontal road line
                if (tLeft === 'ASPHALT' || tRight === 'ASPHALT') {
                    ctx.moveTo(p.x - TILE_WIDTH / 4, p.y - TILE_HEIGHT / 4);
                    ctx.lineTo(p.x + TILE_WIDTH / 4, p.y + TILE_HEIGHT / 4);
                }

                // Vertical road line
                if (tTop === 'ASPHALT' || tBottom === 'ASPHALT') {
                    ctx.moveTo(p.x + TILE_WIDTH / 4, p.y - TILE_HEIGHT / 4);
                    ctx.lineTo(p.x - TILE_WIDTH / 4, p.y + TILE_HEIGHT / 4);
                }

                ctx.stroke();

                // Intersection Processing
                let asphaltCount = 0;
                if (tTop === 'ASPHALT') asphaltCount++;
                if (tRight === 'ASPHALT') asphaltCount++;
                if (tBottom === 'ASPHALT') asphaltCount++;
                if (tLeft === 'ASPHALT') asphaltCount++;

                if (asphaltCount >= 3) {
                    // It's an intersection. We shouldn't draw a gray circle that overlaps badly.
                    // The main diamond is already drawn correctly. 
                    // Let's just draw an intersection dashed square if needed, or leave it blank.
                }
                ctx.restore();
            }
        }
    }

    public drawProp(ctx: CanvasRenderingContext2D, prop: Prop, time: number = 0) {
        const p = isoToScreen(prop.x, prop.y);
        const cx = p.x;
        const cy = p.y;

        // Procedural wind calculation
        const seed = prop.x * 153.1 + prop.y * 31.4;
        const windBase = Math.sin(time * 0.001 + seed) * 0.5 + 0.5; // slow gust
        const windMicro = Math.sin(time * 0.003 + seed * 2); // fast tremble
        const swayAngle = (windBase * windMicro) * 0.05; // radians (about ~3 degrees max output)

        ctx.save();
        ctx.translate(cx, cy);

        if (prop.type === 'TREE') {
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(-3, -20, 6, 20); // Trunk

            // Sway the leaves from the top of the trunk
            ctx.translate(0, -25);
            ctx.rotate(swayAngle * 2);

            ctx.fillStyle = '#2E7D32'; // Leaves
            ctx.beginPath();
            ctx.arc(0, -5, 15, 0, Math.PI * 2);
            ctx.fill();
        } else if (prop.type === 'BUSH') {
            // Sway from the root
            ctx.rotate(swayAngle * 1.5);
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(0, -5, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
