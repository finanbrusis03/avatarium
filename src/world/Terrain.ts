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

    public drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, time: number = 0) {
        const type = this.getTile(x, y);
        const p = isoToScreen(x, y);

        let color = '#4CAF50';
        let topColor = '#66BB6A';

        // Richer, deeper color palette
        switch (type) {
            case 'WATER': color = '#1565C0'; topColor = '#1E88E5'; break;
            case 'SAND': color = '#F57F17'; topColor = '#FBC02D'; break;
            case 'DIRT': color = '#4E342E'; topColor = '#5D4037'; break;
            case 'STONE': color = '#424242'; topColor = '#616161'; break;
            case 'SNOW': color = '#9E9E9E'; topColor = '#BDBDBD'; break;
            case 'ASPHALT': color = '#263238'; topColor = '#37474F'; break;
            case 'GRASS': color = '#2E7D32'; topColor = '#4CAF50'; break;
        }

        ctx.lineWidth = 1;
        // Strong line-art contour for the "SimCity / Modern" aesthetic
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineJoin = 'round';

        // Side
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p.x - TILE_WIDTH / 2, p.y);
        ctx.lineTo(p.x, p.y + TILE_HEIGHT / 2);
        ctx.lineTo(p.x + TILE_WIDTH / 2, p.y);
        ctx.lineTo(p.x, p.y + TILE_HEIGHT / 2 + 5);
        ctx.lineTo(p.x - TILE_WIDTH / 2, p.y + 5);
        ctx.fill();

        // Top
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - TILE_HEIGHT / 2);
        ctx.lineTo(p.x + TILE_WIDTH / 2, p.y);
        ctx.lineTo(p.x, p.y + TILE_HEIGHT / 2);
        ctx.lineTo(p.x - TILE_WIDTH / 2, p.y);
        ctx.fill();

        // SMART BORDERS: Only draw lines if neighboring tile is a DIFFERENT type or empty
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';

        ctx.beginPath();
        // Top-Left Edge
        if (this.getTile(x, y - 1) !== type) {
            ctx.moveTo(p.x - TILE_WIDTH / 2, p.y);
            ctx.lineTo(p.x, p.y - TILE_HEIGHT / 2);
        }
        // Top-Right Edge
        if (this.getTile(x + 1, y) !== type) {
            ctx.moveTo(p.x, p.y - TILE_HEIGHT / 2);
            ctx.lineTo(p.x + TILE_WIDTH / 2, p.y);
        }
        // Bottom-Right Edge
        if (this.getTile(x, y + 1) !== type) {
            ctx.moveTo(p.x + TILE_WIDTH / 2, p.y);
            ctx.lineTo(p.x, p.y + TILE_HEIGHT / 2);
        }
        // Bottom-Left Edge
        if (this.getTile(x - 1, y) !== type) {
            ctx.moveTo(p.x, p.y + TILE_HEIGHT / 2);
            ctx.lineTo(p.x - TILE_WIDTH / 2, p.y);
        }
        ctx.stroke();

        // --- Textures & Highlights ---
        ctx.save();

        // SAFE FALLBACK: Removed ctx.clip() which could be breaking Safari/iOS rendering
        // when applied to the isometric diamond path depending on context state.
        const seed = x * 13.513 + y * 71.93;

        if (type === 'GRASS') {
            // ORGANIC TEXTURES: Replace square pixels with soft circular tufts
            ctx.fillStyle = '#4CAF50';
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                // Bounds scaled down to 60% of tile size to stay within diamond
                const rx = p.x - (TILE_WIDTH * 0.3) + (Math.sin(seed + i * 1.1) * 0.5 + 0.5) * (TILE_WIDTH * 0.6);
                const ry = p.y - (TILE_HEIGHT * 0.3) + (Math.cos(seed + i * 2.2) * 0.5 + 0.5) * (TILE_HEIGHT * 0.6);
                ctx.moveTo(rx, ry);
                ctx.arc(rx, ry, 2 + (i % 2), 0, Math.PI * 2); // Larger, softer circles
            }
            ctx.fill();
        } else if (type === 'SAND') {
            // ORGANIC TEXTURES: Soft circular sand grains
            ctx.fillStyle = '#FBC02D';
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const rx = p.x - (TILE_WIDTH * 0.3) + (Math.sin(seed * i + 3.3) * 0.5 + 0.5) * (TILE_WIDTH * 0.6);
                const ry = p.y - (TILE_HEIGHT * 0.3) + (Math.cos(seed * i + 4.4) * 0.5 + 0.5) * (TILE_HEIGHT * 0.6);
                ctx.moveTo(rx, ry);
                ctx.arc(rx, ry, 1.5, 0, Math.PI * 2); // Use arc instead of rect
            }
            ctx.fill();
        } else if (type === 'ASPHALT') {
            // Road Markings (Dashed Lines) - only if adjacent to another asphalt to form a continuous road
            const tTop = this.getTile(x, y - 1);
            const tRight = this.getTile(x + 1, y);
            const tBottom = this.getTile(x, y + 1);
            const tLeft = this.getTile(x - 1, y);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]); // Dashed
            ctx.beginPath();

            // Draw horizontal road line if left/right is asphalt
            if (tLeft === 'ASPHALT' || tRight === 'ASPHALT') {
                ctx.moveTo(p.x - TILE_WIDTH / 4, p.y - TILE_HEIGHT / 4);
                ctx.lineTo(p.x + TILE_WIDTH / 4, p.y + TILE_HEIGHT / 4);
            }

            // Draw vertical road line if top/bottom is asphalt
            if (tTop === 'ASPHALT' || tBottom === 'ASPHALT') {
                ctx.moveTo(p.x + TILE_WIDTH / 4, p.y - TILE_HEIGHT / 4);
                ctx.lineTo(p.x - TILE_WIDTH / 4, p.y + TILE_HEIGHT / 4);
            }

            ctx.stroke();

            // Intersection Dot
            let asphaltCount = 0;
            if (tTop === 'ASPHALT') asphaltCount++;
            if (tRight === 'ASPHALT') asphaltCount++;
            if (tBottom === 'ASPHALT') asphaltCount++;
            if (tLeft === 'ASPHALT') asphaltCount++;

            if (asphaltCount >= 3) { // Intersection
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.setLineDash([]); // Reset dash for next draws
            ctx.lineWidth = 1; // Reset line width
        } else if (type === 'WATER') {
            // Animated water shimmering lines (Safe line drawing)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;

            const animSpeed = 0.002;
            const wave1 = Math.sin(time * animSpeed + seed) * 0.5 + 0.5;
            const wave2 = Math.cos(time * animSpeed * 1.3 + seed * 2) * 0.5 + 0.5;

            // Draw two horizontal shimmering lines
            const lineY1 = p.y - TILE_HEIGHT / 4 + wave1 * 5;
            ctx.beginPath();
            ctx.moveTo(p.x - TILE_WIDTH / 4, lineY1);
            ctx.lineTo(p.x + TILE_WIDTH / 4, lineY1);
            ctx.stroke();

            const lineY2 = p.y + TILE_HEIGHT / 4 - wave2 * 5;
            ctx.beginPath();
            ctx.moveTo(p.x - TILE_WIDTH / 3, lineY2);
            ctx.lineTo(p.x + TILE_WIDTH / 3, lineY2);
            ctx.stroke();
        }

        ctx.restore();
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
