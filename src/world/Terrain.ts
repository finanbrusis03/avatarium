import { Noise } from '../utils/Noise';
import { isoToScreen, TILE_WIDTH, TILE_HEIGHT } from '../engine/IsoMath';

export type TileType = 'WATER' | 'SAND' | 'GRASS' | 'DIRT' | 'ROAD' | 'PLAZA' | 'DOCK' | 'SOCCER_GRASS';

export interface Prop {
    type: 'TREE' | 'BUSH' | 'ROCK' | 'FLOWER' | 'BONFIRE' | 'UMBRELLA' | 'TOWEL' | 'FOUNTAIN' | 'BENCH';
    x: number;
    y: number;
    variant: number;
}

export class Terrain {
    public width: number;
    public height: number;
    public tiles: Uint8Array;
    private props: Map<string, Prop> = new Map();
    private noise: Noise;

    public static TILE_TYPES: TileType[] = ['WATER', 'SAND', 'GRASS', 'DIRT', 'ROAD', 'PLAZA', 'DOCK', 'SOCCER_GRASS'];

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
        const cx = Math.floor(this.width / 2);
        const cy = Math.floor(this.height / 2);

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const scale = 0.1;
                const h = this.noise.noise2D(x * scale, y * scale);

                let typeIdx = 2; // Grass (index 2 in new TILE_TYPES array)

                // Distance from center for Plaza
                const distToCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

                // Geographical overrides (Bottom-up: Water -> Sand -> Rest)
                const waterEdge = this.height - 6;
                const sandEdge = waterEdge - 10;

                if (distToCenter < 6) {
                    typeIdx = 5; // Central Plaza (PLAZA - index 5)
                } else if (y >= waterEdge) {
                    typeIdx = 0; // Pure Water at the very bottom
                } else if (y >= sandEdge - 1 + (h * 6)) {
                    typeIdx = 1; // Wide Beach Sand with heavily organic/wavy edge
                } else {
                    // Normal Noise Generation
                    if (h < 0.15) typeIdx = 0; // Small inland ponds (WATER)
                    else if (h < 0.22) typeIdx = 1; // Small inland sand patches (SAND)
                    else if (h < 0.55) typeIdx = 2; // Grass (GRASS)
                    else if (h < 0.70) typeIdx = 3; // Dirt (DIRT)
                    else typeIdx = 2; // Default to Grass for higher elevations
                }

                // Organic Meandering Roads (Do not place roads on Plaza or Beach)
                const isVerticalRoad = x % 10 === 0 && h > 0.1 && h < 0.7;
                const isHorizontalRoad = y % 8 === 0 && h > 0.1 && h < 0.7;
                const roadNoise = this.noise.noise2D(x * 0.5, y * 0.5);

                if ((isVerticalRoad || isHorizontalRoad) && typeIdx !== 0 && typeIdx !== 1 && typeIdx !== 5) { // Not Water, Sand, or Plaza
                    if (roadNoise > 0.3) {
                        typeIdx = 4; // ROAD (index 4)
                    }
                }

                this.tiles[y * this.width + x] = typeIdx;

                // Props
                const propHash = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
                const val = propHash - Math.floor(propHash);

                if (typeIdx === 2 || typeIdx === 3) {
                    // Forest Props on Grass/Dirt
                    if (val > 0.92) {
                        let propType: Prop['type'] = 'BUSH';
                        if (val > 0.98) propType = 'TREE';
                        else if (val > 0.96) propType = 'ROCK';
                        else if (val > 0.94) propType = 'FLOWER';

                        this.props.set(`${x},${y}`, {
                            type: propType,
                            x, y, variant: Math.floor(val * 100) % 3
                        });
                    }
                } else if (typeIdx === 1) {
                    // Beach Props on Sand
                    if (val > 0.90 && y > this.height - 20) { // High density on the coastal strip
                        this.props.set(`${x},${y}`, {
                            type: val > 0.96 ? 'UMBRELLA' : 'TOWEL',
                            x, y, variant: Math.floor(val * 100) % 6
                        });
                    }
                }
                // Central Plaza e Stone retirado da tipagem
                if (Terrain.TILE_TYPES[typeIdx] === 'PLAZA') {
                    this.props.set(`${x},${y}`, { type: 'FOUNTAIN', x, y, variant: 0 });
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

    public removePropAt(x: number, y: number) {
        this.props.delete(`${x},${y}`);
    }

    public getTileColor(type: TileType): string {
        switch (type) {
            case 'WATER': return '#1E88E5'; // Changed to brighter blue for base
            case 'GRASS': return '#4CAF50';
            case 'DIRT': return '#795548';
            case 'ROAD': return '#607D8B';
            case 'PLAZA': return '#CFD8DC';
            case 'SAND': return '#FBC02D';
            case 'SOCCER_GRASS': return '#2E7D32'; // Escuro
            default: return '#000';
        }
    }

    public getTileTopColor(type: TileType): string {
        switch (type) {
            case 'WATER': return '#42A5F5';
            case 'SAND': return '#FFEE58';
            case 'DIRT': return '#795548';
            case 'ROAD': return '#607D8B';
            case 'GRASS': return '#66BB6A';
            case 'PLAZA': return '#E0E0E0';
            case 'SOCCER_GRASS': return '#388E3C';
            default: return '#000';
        }
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

        // Pass 1: Organic Biome Splats (Water -> Sand -> Dirt -> Grass -> Plaza)
        // WATER is first. It draws an oversized ellipse that smooths out the world border.
        // Overlapping sand/grass will "eat" the water's inner corners creating organic beaches,
        // while the outer black canvas border gets rounded off by the water ellipse.
        const organicOrder: TileType[] = ['WATER', 'SAND', 'GRASS', 'DIRT', 'ROAD', 'PLAZA', 'DOCK', 'SOCCER_GRASS'];
        for (const targetType of organicOrder) {
            for (let x = startX; x <= endX; x++) {
                for (let y = startY; y <= endY; y++) {
                    if (this.getTile(x, y) === targetType) {
                        const p = isoToScreen(x, y);

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
                    const noiseVal = this.noise.noise2D(x * 0.2, y * 0.2);

                    // Darker organic patches in the grass
                    if (noiseVal < 0.3) {
                        ctx.fillStyle = '#388E3C';
                    } else if (noiseVal > 0.7) {
                        ctx.fillStyle = '#66BB6A';
                    }

                    ctx.beginPath();
                    for (let i = 0; i < 4; i++) {
                        const rx = p.x - (TILE_WIDTH * 0.3) + (Math.sin(seed + i * 1.1) * 0.5 + 0.5) * (TILE_WIDTH * 0.6);
                        const ry = p.y - (TILE_HEIGHT * 0.3) + (Math.cos(seed + i * 2.2) * 0.5 + 0.5) * (TILE_HEIGHT * 0.6);
                        ctx.moveTo(rx, ry);
                        ctx.arc(rx, ry, 2 + (i % 2), 0, Math.PI * 2);
                    }
                    ctx.fill();

                    // Tiny generic flowers randomly 
                    const flowVal = (Math.sin(seed * 45.123) * 1000) % 1;
                    if (flowVal > 0.5 && flowVal < 0.55) {
                        ctx.fillStyle = flowVal > 0.52 ? '#FFEB3B' : '#FFF';
                        ctx.globalAlpha = 0.9;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y + TILE_HEIGHT / 4, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (type === 'SOCCER_GRASS') {
                    // Lines are drawn separate, grass texture only
                    ctx.fillStyle = '#2E7D32';
                    ctx.globalAlpha = 0.8;
                    ctx.beginPath();
                    for (let i = 0; i < 4; i++) {
                        const rx = p.x - (TILE_WIDTH * 0.3) + (Math.sin(seed + i * 1.1) * 0.5 + 0.5) * (TILE_WIDTH * 0.6);
                        const ry = p.y - (TILE_HEIGHT * 0.3) + (Math.cos(seed + i * 2.2) * 0.5 + 0.5) * (TILE_HEIGHT * 0.6);
                        ctx.moveTo(rx, ry);
                        ctx.arc(rx, ry, 1 + (i % 2), 0, Math.PI * 2);
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
                    ctx.globalAlpha = 0.4;
                    ctx.beginPath();

                    // Base sand grains
                    for (let i = 0; i < 8; i++) {
                        const rx = p.x - (TILE_WIDTH * 0.45) + (Math.sin(seed * i + 3.3) * 0.5 + 0.5) * (TILE_WIDTH * 0.9);
                        const ry = p.y - (TILE_HEIGHT * 0.45) + (Math.cos(seed * i + 4.4) * 0.5 + 0.5) * (TILE_HEIGHT * 0.9);
                        ctx.moveTo(rx, ry);
                        ctx.arc(rx, ry, Math.random() < 0.5 ? 0.8 : 1.2, 0, Math.PI * 2);
                    }
                    ctx.fill();

                    // Larger dark dunes/footprint impressions occasionally
                    if (seed % 1 < 0.2) {
                        ctx.fillStyle = 'rgba(215, 153, 34, 0.3)';
                        ctx.beginPath();
                        ctx.ellipse(p.x, p.y + 2, 4, 2, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (type === 'ROAD') {
                    // Pedestrian crosswalks near intersections
                    const xMod = x % 10;
                    const yMod = y % 8; // Roads are horizontal every 8 tiles

                    const nearVerticalIntersection = xMod === 0 && (y % 8 === 2 || y % 8 === 6);
                    const nearHorizontalIntersection = yMod === 0 && (x % 10 === 2 || x % 10 === 8);

                    if (nearVerticalIntersection || nearHorizontalIntersection) {
                        ctx.save();
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                        ctx.translate(p.x, p.y);

                        const isVerticalRoad = xMod === 0;
                        ctx.rotate(isVerticalRoad ? (Math.PI / 6) : (-Math.PI / 6));

                        // 4 Listras Brancas estilo Abbey Road
                        for (let i = -1.5; i <= 1.5; i += 1) {
                            ctx.fillRect(i * 8 - 2, -12, 4, 24);
                        }

                        ctx.restore();
                    }
                } else if (type === 'PLAZA') {
                    const cx = Math.floor(this.width / 2);
                    const cy = Math.floor(this.height / 2);
                    const distToCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

                    // Central Plaza Mosaic (Portuguese Pavement Style)
                    if (distToCenter < 8) {
                        ctx.save();
                        // Darker stones for more contrast
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
                        ctx.lineWidth = 0.8;

                        const stoneSeed = x * 1.5 + y * 2.1;
                        for (let i = 0; i < 6; i++) {
                            ctx.beginPath();
                            const ox = Math.sin(stoneSeed + i) * (TILE_WIDTH * 0.35);
                            const oy = Math.cos(stoneSeed + i * 1.5) * (TILE_HEIGHT * 0.35);
                            ctx.arc(p.x + ox, p.y + oy, 1.8 + (i % 2), 0, Math.PI * 2);
                            ctx.stroke();
                        }

                        // Decorative radial patterns
                        if (distToCenter < 1.0 || (distToCenter > 3.9 && distToCenter < 4.1)) {
                            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.ellipse(p.x, p.y, TILE_WIDTH * 0.4, TILE_HEIGHT * 0.4, 0, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                        ctx.restore();
                    }
                } else if (type === 'WATER') {
                    // Shoreline Waves (Surf/Foam)
                    const isShore = this.getTile(x, y - 1) === 'SAND' || this.getTile(x - 1, y) === 'SAND';

                    if (isShore) {
                        const waveSpeed = 0.0015;
                        const waveCycle = (time * waveSpeed + (x + y) * 0.5);
                        // Normalize sin to 0-1 for surge
                        const surge = (Math.sin(waveCycle) + 1) / 2;

                        ctx.save();
                        // Foam base filling
                        ctx.fillStyle = `rgba(255, 255, 255, ${surge * 0.35})`;
                        ctx.beginPath();
                        // Push foam towards inland (upwards in screen Y)
                        const foamOffset = -surge * 18;
                        ctx.ellipse(p.x, p.y + foamOffset, (TILE_WIDTH / 2) * 1.1, (TILE_HEIGHT / 2) * 1.1, 0, 0, Math.PI * 2);
                        ctx.fill();

                        // Shoreline bright foam line
                        ctx.strokeStyle = `rgba(255, 255, 255, ${surge * 0.8})`;
                        ctx.lineWidth = 1.5 + surge;
                        ctx.beginPath();
                        ctx.ellipse(p.x, p.y + foamOffset - 2, TILE_WIDTH / 2, TILE_HEIGHT / 2, 0, Math.PI, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }

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
                if (type === 'ROAD') {
                    raisedTiles.push({ x, y, type, depth: x + y });
                }
            }
        }

        raisedTiles.sort((a, b) => a.depth - b.depth);

        for (const t of raisedTiles) {
            const p = isoToScreen(t.x, t.y);

            if (t.type === 'ROAD') {
                // Asphalt is a flat terrain feature, drawn on top like an organic splat
                ctx.fillStyle = this.getTileTopColor('ROAD');
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, (TILE_WIDTH / 2) * 1.35, (TILE_HEIGHT / 2) * 1.35, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw Road Markings
            if (t.type === 'ROAD') {
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
                if (tLeft === 'ROAD' || tRight === 'ROAD') {
                    ctx.moveTo(p.x - TILE_WIDTH / 4, p.y - TILE_HEIGHT / 4);
                    ctx.lineTo(p.x + TILE_WIDTH / 4, p.y + TILE_HEIGHT / 4);
                }

                // Vertical road line
                if (tTop === 'ROAD' || tBottom === 'ROAD') {
                    ctx.moveTo(p.x + TILE_WIDTH / 4, p.y - TILE_HEIGHT / 4);
                    ctx.lineTo(p.x - TILE_WIDTH / 4, p.y + TILE_HEIGHT / 4);
                }

                ctx.stroke();

                // Intersection Processing
                let asphaltCount = 0;
                if (tTop === 'ROAD') asphaltCount++;
                if (tRight === 'ROAD') asphaltCount++;
                if (tBottom === 'ROAD') asphaltCount++;
                if (tLeft === 'ROAD') asphaltCount++;

                if (asphaltCount >= 3) {
                    // It's an intersection. We shouldn't draw a gray circle that overlaps badly.
                    // The main diamond is already drawn correctly.
                    // Let's just draw an intersection dashed square if needed, or leave it blank.
                }
                ctx.restore();
            }
        }
    }

    public drawProp(ctx: CanvasRenderingContext2D, prop: Prop, time: number = 0, lightLevel: number = 1.0) {
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

        // Dynamic Nature Shadow
        if (prop.type === 'TREE' || prop.type === 'BUSH' || prop.type === 'UMBRELLA' || prop.type === 'ROCK') {
            const sunAngle = (time * 0.0001) % (Math.PI * 2);
            const shadowOpacity = Math.max(0, (lightLevel - 0.4)) * 0.4;
            let shadowLen = prop.type === 'TREE' ? 40 : (prop.type === 'BUSH' ? 15 : 10);
            shadowLen += (1 - lightLevel) * 20;

            ctx.save();
            ctx.globalAlpha = shadowOpacity;
            ctx.fillStyle = '#000000';
            const dx = Math.cos(sunAngle) * shadowLen;
            const dy = (Math.sin(sunAngle) * shadowLen) * 0.5;

            ctx.beginPath();
            ctx.ellipse(dx / 2, dy / 2, shadowLen / 2, shadowLen / 4, Math.atan2(dy, dx), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (prop.type === 'TREE') {
            const variant = prop.variant % 3;

            // 0: Giant Oak (Redonda, Clássica)
            // 1: Tall Pine (Triangular longo)
            // 2: Cypress / Poplar (Oval alta)

            if (variant === 0) {
                // Giant Oak
                ctx.fillStyle = '#4E342E';
                ctx.fillRect(-5, -30, 10, 30); // Trunk

                ctx.translate(0, -35); // Sway pivot
                ctx.rotate(swayAngle * 1.5);

                ctx.fillStyle = '#2E7D32';
                ctx.beginPath();
                ctx.arc(0, -10, 25, 0, Math.PI * 2); // Huge Canopy
                ctx.fill();

                // Highlight
                ctx.fillStyle = '#388E3C';
                ctx.beginPath();
                ctx.arc(-5, -15, 12, 0, Math.PI * 2);
                ctx.fill();

            } else if (variant === 1) {
                // Tall Pine
                ctx.fillStyle = '#3E2723';
                ctx.fillRect(-4, -25, 8, 25);

                ctx.translate(0, -25);
                ctx.rotate(swayAngle * 2.5);

                ctx.fillStyle = '#1B5E20';

                // Layer 1 (Bottom)
                ctx.beginPath();
                ctx.moveTo(0, -30);
                ctx.lineTo(-20, 5);
                ctx.lineTo(20, 5);
                ctx.fill();

                // Layer 2 (Mid)
                ctx.beginPath();
                ctx.moveTo(0, -45);
                ctx.lineTo(-15, -10);
                ctx.lineTo(15, -10);
                ctx.fill();

                // Layer 3 (Top)
                ctx.beginPath();
                ctx.moveTo(0, -55);
                ctx.lineTo(-10, -25);
                ctx.lineTo(10, -25);
                ctx.fill();

            } else {
                // Cypress (Oval Alta)
                ctx.fillStyle = '#4E342E';
                ctx.fillRect(-3, -20, 6, 20); // Short visible trunk

                ctx.translate(0, -25);
                ctx.rotate(swayAngle * 1.8);

                ctx.fillStyle = '#33691E'; // Dark yellow-green
                ctx.beginPath();
                ctx.ellipse(0, -20, 12, 35, 0, 0, Math.PI * 2); // Tall ellipse
                ctx.fill();

                // Inner texture core
                ctx.fillStyle = '#558B2F';
                ctx.beginPath();
                ctx.ellipse(-2, -20, 5, 25, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (prop.type === 'BUSH') {
            // Sway from the root
            ctx.rotate(swayAngle * 1.5);
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(0, -5, 8, 0, Math.PI * 2);
            ctx.fill();
        } else if (prop.type === 'UMBRELLA') {
            const colors = ['#F44336', '#2196F3', '#4CAF50', '#FFEB3B'];
            const color = colors[prop.variant % colors.length];

            ctx.fillStyle = '#E0E0E0'; // Pole
            ctx.fillRect(-1, -25, 2, 25);

            // Sway umbrella top
            ctx.translate(0, -20);
            ctx.rotate(swayAngle * 3);

            // Umbrella canopy
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, 12, Math.PI, 0); // half circle
            ctx.fill();

            // White stripes
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-2, 0);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(4, 0);
            ctx.lineTo(2, 0);
            ctx.fill();

            // Little top knob
            ctx.fillStyle = '#E0E0E0';
            ctx.beginPath();
            ctx.arc(0, -12, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (prop.type === 'TOWEL') {
            const colors = ['#E91E63', '#00BCD4', '#FF9800', '#9C27B0'];
            const color = colors[prop.variant % colors.length];

            // Towel is a flat diamond on the ground
            const tw = 16;
            const th = 8;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, -th);
            ctx.lineTo(tw, 0);
            ctx.lineTo(0, th);
            ctx.lineTo(-tw, 0);
            ctx.fill();

            // White stripes on towel
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.moveTo(tw * 0.4, -th * 0.4);
            ctx.lineTo(tw * 0.8, -th * 0.0);
            ctx.lineTo(tw * 0.4, th * 0.4);
            ctx.lineTo(tw * 0.0, th * 0.0);
            ctx.fill();
        } else if (prop.type === 'ROCK') {
            ctx.fillStyle = prop.variant === 0 ? '#757575' : '#9E9E9E';
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(0, -8);
            ctx.lineTo(12, 0);
            ctx.lineTo(0, 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.moveTo(-5, -2);
            ctx.lineTo(0, -6);
            ctx.lineTo(5, -2);
            ctx.fill();
        } else if (prop.type === 'FLOWER') {
            const colors = ['#FFEB3B', '#F44336', '#E91E63'];
            ctx.fillStyle = colors[prop.variant % colors.length];

            // Sway flowers
            ctx.rotate(swayAngle * 4);

            // Center
            ctx.beginPath();
            ctx.arc(0, -3, 3, 0, Math.PI * 2);
            ctx.fill();

            // Petals
            ctx.fillStyle = '#FFF';
            for (let i = 0; i < 5; i++) {
                ctx.save();
                ctx.rotate((i * 72) * Math.PI / 180);
                ctx.beginPath();
                ctx.ellipse(5, -3, 3, 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    }
}
