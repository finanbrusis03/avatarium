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

                if ((x % 10 === 0 || y % 10 === 0) && h > 0.3) {
                    // Grid roads?
                    // typeIdx = 6; // Asphalt
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

    public drawTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
        const type = this.getTile(x, y);
        const p = isoToScreen(x, y);

        let color = '#4CAF50';
        let topColor = '#66BB6A';

        switch (type) {
            case 'WATER': color = '#1976D2'; topColor = '#2196F3'; break;
            case 'SAND': color = '#FBC02D'; topColor = '#FDD835'; break;
            case 'DIRT': color = '#5D4037'; topColor = '#795548'; break;
            case 'STONE': color = '#616161'; topColor = '#757575'; break;
            case 'SNOW': color = '#BDBDBD'; topColor = '#E0E0E0'; break;
            case 'ASPHALT': color = '#212121'; topColor = '#424242'; break;
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';

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
        ctx.stroke();
    }

    public drawProp(ctx: CanvasRenderingContext2D, prop: Prop) {
        const p = isoToScreen(prop.x, prop.y);
        const cx = p.x;
        const cy = p.y;

        if (prop.type === 'TREE') {
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(cx - 3, cy - 20, 6, 20); // Trunk

            ctx.fillStyle = '#2E7D32'; // Leaves
            ctx.beginPath();
            ctx.arc(cx, cy - 30, 15, 0, Math.PI * 2);
            ctx.fill();
        } else if (prop.type === 'BUSH') {
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(cx, cy - 5, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
