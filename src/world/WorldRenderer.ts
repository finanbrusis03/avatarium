import type { Camera } from '../engine/Camera';
import { isoToScreen } from '../engine/IsoMath';
import type { Creature } from './EntityManager';
import { AvatarRenderer } from '../render/AvatarRenderer';
import { Terrain, type Prop } from './Terrain';
import { StructureManager, type Structure } from './StructureManager';
import type { WorldConfig } from '../services/WorldConfigService';
import { globalParticleSystem } from '../engine/ParticleSystem';

export class WorldRenderer {
    private ctx: CanvasRenderingContext2D;
    public canvasWidth: number;
    public canvasHeight: number;
    public seed: string;
    private avatarRenderer: AvatarRenderer;
    private terrain: Terrain;
    private structureManager: StructureManager;
    private weather: 'NONE' | 'RAIN' | 'SNOW' = 'RAIN'; // Default to rain for demo

    public get structureManagerInstance() {
        return this.structureManager;
    }

    public get terrainInstance() {
        return this.terrain;
    }

    // Config cache
    private config: WorldConfig; // Changed to private, initialized in constructor

    constructor(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, config: WorldConfig) {
        this.ctx = ctx;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.seed = config.seed;
        this.config = config;
        this.avatarRenderer = new AvatarRenderer(ctx);
        this.terrain = new Terrain(config.width, config.height, config.seed);
        this.structureManager = new StructureManager(config.width, config.height, config.seed);
    }

    public get mapWidth() { return this.config.width; }
    public get mapHeight() { return this.config.height; }

    public updateConfig(config: WorldConfig) {
        this.config = config;
        this.seed = config.seed;
    }

    public isPositionBlocked(x: number, y: number): boolean {
        // 1. Bounds Check
        if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height) return true;

        // 2. Terrain Check (Water)
        // Note: We use Math.floor because creatures are at grid coords, but let's be safe
        const tile = this.terrain.getTile(Math.floor(x), Math.floor(y));
        if (tile === 'WATER') return true;

        // 3. Structure Check
        return this.structureManager.isBlocked(x, y);
    }

    public clear() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    public drawWorld(camera: Camera, creatures: Creature[], time: number, lightLevel: number, activeEvent: string | null = null, selectedId: string | null = null) {
        const { ctx } = this;

        // Ensure clean state start
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';

        ctx.save();

        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;

        ctx.translate(centerX, centerY);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        // 1. Draw Terrain (Full Layered Pass)
        this.terrain.drawFullTerrain(ctx, 0, this.config.width - 1, 0, this.config.height - 1, time);

        // 2. Renderables
        interface RenderItem {
            type: 'CREATURE' | 'PROP' | 'STRUCTURE' | 'LAMP_POST';
            obj: Creature | Prop | Structure;
            depth: number;
            ex: number;
            ey: number;
            id: string;
            alpha?: number; // For x-ray
        }

        const items: RenderItem[] = [];

        // Add Creatures
        for (const c of creatures) {
            items.push({
                type: 'CREATURE',
                obj: c,
                depth: c.x + c.y,
                ex: c.x,
                ey: c.y,
                id: c.id
            });
        }

        // Add Props
        const getPropId = (x: number, y: number) => `prop_${x}_${y}`;
        for (let x = 0; x < this.config.width; x++) {
            for (let y = 0; y < this.config.height; y++) {
                const prop = this.terrain.getPropAt(x, y);
                if (prop) {
                    items.push({
                        type: 'PROP',
                        obj: prop,
                        depth: x + y,
                        ex: x,
                        ey: y,
                        id: getPropId(x, y)
                    });
                }
            }
        }

        // Add Structures & check X-Ray
        const lampPosts: Structure[] = [];

        for (const s of this.structureManager.structures) {
            if (s.type === 'LAMP_POST') {
                lampPosts.push(s);
            }

            const depth = (s.x + s.width - 1) + (s.y + s.height - 1) + 0.5;

            // X-Ray Check
            let alpha = 1.0;
            // Check if any creature is "behind" this structure
            // House footprint: [x, x+w], [y, y+h]
            const margin = 1.5;
            const isObscuring = creatures.some(c => {
                const cDepth = c.x + c.y;
                if (cDepth >= depth) return false; // Creature is in front

                // Check spatial overlap (expanded footprint)
                return (
                    c.x >= s.x - margin && c.x <= s.x + s.width + margin / 2 &&
                    c.y >= s.y - margin && c.y <= s.y + s.height + margin / 2
                );
            });

            if (isObscuring && s.type !== 'LAMP_POST') {
                alpha = 0.45;
            }

            items.push({
                type: s.type === 'LAMP_POST' ? 'LAMP_POST' : 'STRUCTURE',
                obj: s,
                depth: depth,
                ex: s.x,
                ey: s.y,
                id: s.id,
                alpha
            });
        }

        // Stable Sort
        items.sort((a, b) => {
            if (Math.abs(a.depth - b.depth) > 0.01) return a.depth - b.depth;
            if (a.ex !== b.ex) return a.ex - b.ex;
            if (a.ey !== b.ey) return a.ey - b.ey;
            return a.id.localeCompare(b.id);
        });

        // 3. Draw Items
        for (const item of items) {
            if (item.type === 'PROP') {
                this.terrain.drawProp(ctx, item.obj as Prop, time);
            } else if (item.type === 'CREATURE') {
                const c = item.obj as Creature;
                if (c.id === selectedId) {
                    this.avatarRenderer.drawHighlight(c, 'selected');
                }
                this.avatarRenderer.draw(c, camera, time);
            } else { // All other structure types
                const s = item.obj as Structure;
                ctx.save();
                if (item.alpha && item.alpha < 1) {
                    ctx.globalAlpha = item.alpha;
                } else {
                    ctx.globalAlpha = 1.0;
                }

                if (s.type === 'FOUNTAIN') {
                    this.drawFountain(ctx, s, time);
                } else if (s.type === 'LAMP_POST') {
                    this.drawLampPostBase(ctx, s, lightLevel, time); // Base only, glow is separate pass
                } else if (s.type === 'BENCH') {
                    this.drawBench(ctx, s);
                } else if (s.type === 'SOCCER_FIELD') {
                    this.drawSoccerField(ctx, s);
                } else {
                    // Houses and other generic structures
                    this.drawStructure(ctx, s, lightLevel);
                }
                ctx.restore();
            }
        }

        // 4. Ambient Particles
        this.drawAmbientEffects(ctx, time, lightLevel, activeEvent);

        // 4.1 Global Particles (Spawn Poofs, etc)
        globalParticleSystem.update(16); // Approx 60fps delta
        globalParticleSystem.draw(ctx);

        // 4.2 Procedural Cloud Shadows
        this.drawClouds(ctx, time);

        // 4.3 Weather Effects (Rain/Snow) - Draw above everything but below UI
        this.drawWeather(ctx, time);

        ctx.restore(); // Restore transform for Overlay

        // 5. Day/Night Overlay & Atmospheric Coloring
        if (lightLevel < 0.99) {
            ctx.save();

            // Sunset Phase (lightLevel between 0.4 and 0.9)
            if (lightLevel > 0.4) {
                // Peak sunset intensity at 0.65
                const sunsetIntensity = Math.max(0, 1.0 - Math.abs(lightLevel - 0.65) / 0.25);
                if (sunsetIntensity > 0) {
                    const alpha = sunsetIntensity * 0.35;
                    // Warm golden/orange glow
                    ctx.fillStyle = `rgba(255, 140, 50, ${alpha})`;
                    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
                }
            }

            // Night Phase (lightLevel < 0.65)
            if (lightLevel < 0.65) {
                const nightAlpha = Math.min(0.85, (0.65 - lightLevel) / 0.45 * 0.85);

                // IMPORTANTE: Resetar o transform para desenhar em toda a tela (ignorando câmera/zoom)
                ctx.save();
                ctx.resetTransform();
                ctx.fillStyle = `rgba(15, 15, 45, ${nightAlpha})`;
                ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
                ctx.restore();
            }

            // 6. Special Light Gaps / Glows (Drawn AFTER night mask in some cases, or BEFORE with screen blending)
            // But let's draw lamp glows above the night mask for better "pop"
            ctx.save();
            ctx.setTransform(camera.zoom, 0, 0, camera.zoom, this.canvasWidth / 2 - camera.x * camera.zoom, this.canvasHeight / 2 - camera.y * camera.zoom);
            for (const item of items) {
                if (item.type === 'LAMP_POST') {
                    this.drawLampPostGlow(ctx, item.obj as Structure, lightLevel, time);
                }
            }
            ctx.restore();

            ctx.restore();
        }

        // Final cleanup
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    private drawAmbientEffects(ctx: CanvasRenderingContext2D, time: number, lightLevel: number, activeEvent: string | null) {
        // Folhas/Vento ao invés de partículas genéricas
        const isNight = lightLevel < 0.4;
        const particleCount = 40;
        const bounds = Math.max(this.config.width, this.config.height);

        // Festival = Confetes dourados. Normal = Folhas verdes voando ao vento
        const isFestival = activeEvent === 'FESTIVAL';
        const colors = isFestival ? ['#FFD700', '#FFA500', '#FF4500'] : ['#4CAF50', '#8BC34A', '#CDDC39'];

        for (let i = 0; i < particleCount; i++) {
            const seed = i * 1337;
            const speed = 0.001;
            const t = time * speed + seed;

            // Cordenadas Isométricas base
            const gridX = (Math.sin(t * 0.8) * 0.5 + 0.5) * bounds;
            const gridY = (Math.cos(t * 0.9 + seed) * 0.5 + 0.5) * bounds;

            const p = isoToScreen(gridX, gridY);

            // Altura / Flutuação com vento mais caótico
            const floatY = Math.sin(time * 0.003 + i) * 30 - 40;
            const floatX = Math.cos(time * 0.002 + i) * 20;

            const alpha = Math.max(0, (Math.sin(time * 0.004 + seed) + 1) / 2);
            // Rotacionar a folha
            const rotation = time * 0.002 * (i % 2 === 0 ? 1 : -1) + seed;

            ctx.save();
            ctx.globalAlpha = alpha * (isNight ? 0.6 : 0.9); // Folhas mais visíveis de dia
            ctx.fillStyle = colors[i % colors.length];

            ctx.translate(p.x + floatX, p.y + floatY);
            ctx.rotate(rotation);
            ctx.fillRect(-2, -1, 4, 2); // Formato de folha/confete

            ctx.restore();
        }
    }

    private drawClouds(ctx: CanvasRenderingContext2D, time: number) {
        // Draw large moving shadows across the world
        const cloudCount = 6;

        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#000000';

        const worldPixelWidth = this.config.width * 64 * 2; // Rough bounds
        const worldPixelHeight = this.config.height * 32 * 2;

        for (let i = 0; i < cloudCount; i++) {
            const speed = 0.02 + (i * 0.003);
            const size = 300 + (i * 50);

            // Continual movement looping across the map bounding box
            const offsetX = (time * speed + i * 1000) % (worldPixelWidth * 2) - worldPixelWidth;
            const offsetY = (time * (speed * 0.7) + i * 800) % (worldPixelHeight * 2) - worldPixelHeight;

            ctx.beginPath();
            ctx.ellipse(offsetX, offsetY, size, size * 0.6, 0, 0, Math.PI * 2);
            ctx.ellipse(offsetX + size * 0.8, offsetY + size * 0.2, size * 0.7, size * 0.5, 0, 0, Math.PI * 2);
            ctx.ellipse(offsetX - size * 0.6, offsetY - size * 0.1, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    private drawStructure(ctx: CanvasRenderingContext2D, s: Structure, lightLevel: number) {
        // This method now specifically handles 'HOUSE_SMALL' and 'HOUSE_MEDIUM' (or generic buildings)
        // Other structure types like FOUNTAIN, LAMP_POST, BENCH are handled by their own methods.

        const p2 = isoToScreen(s.x + s.width - 0.5, s.y - 0.5); // Right
        const p3 = isoToScreen(s.x + s.width - 0.5, s.y + s.height - 0.5); // Bottom/Front
        const p4 = isoToScreen(s.x - 0.5, s.y + s.height - 0.5); // Left
        const p1 = isoToScreen(s.x - 0.5, s.y - 0.5); // Back/Top

        const isHouse = s.type === 'HOUSE_SMALL';
        const height = isHouse ? 40 : 110;

        ctx.lineWidth = 1.5;
        // Keep the stroke softer for houses to look less "pixel perfect grid"
        ctx.strokeStyle = isHouse ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.45)';
        ctx.lineJoin = 'round';

        // Base Shadow
        ctx.save();
        ctx.globalAlpha = isHouse ? 0.2 : 0.3; // Softer shadow for small houses
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(p4.x - 10, p4.y + 5);
        ctx.lineTo(p3.x, p3.y + 10);
        ctx.lineTo(p2.x + 10, p2.y + 5);
        ctx.lineTo(p2.x, p2.y - 10);
        ctx.lineTo(p4.x, p4.y - 10);
        ctx.fill();
        ctx.restore();

        // Building Palettes based on hash
        let hash = 0;
        for (let i = 0; i < s.id.length; i++) hash = (hash << 5) - hash + s.id.charCodeAt(i);

        // Different palettes for medium vs small houses
        const palettesMed = [
            { left: '#37474F', right: '#546E7A', top: '#CFD8DC' }, // Blue-Grey factory
            { left: '#4E342E', right: '#6D4C41', top: '#A1887F' }, // Brown brick
            { left: '#2E3131', right: '#6C7A89', top: '#EEEEEE' }, // Modern white/glass
            { left: '#006064', right: '#00838F', top: '#80DEEA' }  // Cyan glass
        ];

        const palettesSmall = [
            { left: '#D7CCC8', right: '#EFEBE9', roofBase: '#A1887F', roofHighlight: '#BCAAA4', door: '#5D4037' }, // Cozy white
            { left: '#FFCC80', right: '#FFE0B2', roofBase: '#FF7043', roofHighlight: '#FF8A65', door: '#4E342E' }, // Peach/Orange
            { left: '#A5D6A7', right: '#C8E6C9', roofBase: '#5c4033', roofHighlight: '#6e4c3d', door: '#3E2723' }, // Light Green
            { left: '#90CAF9', right: '#BBDEFB', roofBase: '#37474F', roofHighlight: '#455A64', door: '#1C2833' }, // Light Blue
        ];

        const palMed = palettesMed[Math.abs(hash) % palettesMed.length];
        const palSmall = palettesSmall[Math.abs(hash) % palettesSmall.length];

        if (!isHouse) {
            // ==================
            // COMMERCIAL BUILDING (HOUSE_MEDIUM)
            // ==================
            const leftGrad = ctx.createLinearGradient(p4.x, p4.y, p4.x, p4.y - height);
            leftGrad.addColorStop(0, '#111111');
            leftGrad.addColorStop(1, palMed.left);
            ctx.fillStyle = leftGrad;
            ctx.beginPath();
            ctx.moveTo(p4.x, p4.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p3.x, p3.y - height);
            ctx.lineTo(p4.x, p4.y - height);
            ctx.fill(); ctx.stroke();

            const rightGrad = ctx.createLinearGradient(p3.x, p3.y, p3.x, p3.y - height);
            rightGrad.addColorStop(0, '#222222');
            rightGrad.addColorStop(1, palMed.right);
            ctx.fillStyle = rightGrad;
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p2.x, p2.y - height);
            ctx.lineTo(p3.x, p3.y - height);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = palMed.top;
            ctx.beginPath();
            ctx.moveTo(p4.x, p4.y - height);
            ctx.lineTo(p3.x, p3.y - height);
            ctx.lineTo(p2.x, p2.y - height);
            ctx.lineTo(p1.x, p1.y - height);
            ctx.fill(); ctx.stroke();

            // Draw Lit Windows (Procedural Matrix)
            const floors = 5;
            const colsLeft = s.width * 2;
            const colsRight = s.height * 2;

            const drawWindow = (u: number, v: number, face: 'LEFT' | 'RIGHT') => {
                let wx, wy;
                if (face === 'LEFT') {
                    wx = p4.x + (p3.x - p4.x) * u;
                    wy = p4.y + (p3.y - p4.y) * u - (height * v);
                } else {
                    wx = p3.x + (p2.x - p3.x) * u;
                    wy = p3.y + (p2.y - p3.y) * u - (height * v);
                }

                const winHash = Math.abs(hash * (Math.floor(u * 10) + 1) * (Math.floor(v * 10) + 1));
                // Windows are only lit at night (lightLevel < 0.6)
                const isLit = lightLevel < 0.6 && (winHash % 100) > 55;

                ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.lineWidth = 1;

                ctx.beginPath();
                if (face === 'LEFT') {
                    ctx.moveTo(wx, wy);
                    ctx.lineTo(wx + 8, wy + 4);
                    ctx.lineTo(wx + 8, wy + 14);
                    ctx.lineTo(wx, wy + 10);
                } else {
                    ctx.moveTo(wx, wy);
                    ctx.lineTo(wx + 8, wy - 4);
                    ctx.lineTo(wx + 8, wy + 6);
                    ctx.lineTo(wx, wy + 10);
                }

                if (isLit) {
                    ctx.save();
                    ctx.fillStyle = '#FFF59D'; // Neon yellow
                    ctx.shadowColor = '#FFF59D';
                    ctx.shadowBlur = 10;
                    ctx.fill();
                    ctx.restore();
                    ctx.stroke();
                } else {
                    ctx.fillStyle = '#1A232E'; // Dark glass
                    ctx.fill();
                    ctx.stroke();
                }
            };

            for (let f = 1; f <= floors; f++) {
                for (let c = 1; c < colsLeft; c++) {
                    drawWindow(c / colsLeft, f / (floors + 1), 'LEFT');
                }
                for (let c = 1; c < colsRight; c++) {
                    drawWindow(c / colsRight, f / (floors + 1), 'RIGHT');
                }
            }

            // Roof details
            const cx = (p1.x + p3.x) / 2;
            const cy = (p1.y + p3.y) / 2 - height;

            ctx.fillStyle = '#9E9E9E'; ctx.fillRect(cx - 15, cy - 10, 16, 12); ctx.strokeRect(cx - 15, cy - 10, 16, 12);
            ctx.beginPath(); ctx.moveTo(cx + 8, cy - 5); ctx.lineTo(cx + 8, cy - 35); ctx.stroke();
            ctx.fillStyle = '#F44336'; ctx.beginPath(); ctx.arc(cx + 8, cy - 35, 2.5, 0, Math.PI * 2); ctx.fill();
            if (Date.now() % 2000 > 1000) {
                ctx.fillStyle = 'rgba(244, 67, 54, 0.4)'; ctx.beginPath(); ctx.arc(cx + 8, cy - 35, 6, 0, Math.PI * 2); ctx.fill();
            }

        } else {
            // ==================
            // RESIDENTIAL HOUSE (HOUSE_SMALL)
            // ==================
            // Left Wall
            ctx.fillStyle = palSmall.left;
            ctx.beginPath();
            ctx.moveTo(p4.x, p4.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p3.x, p3.y - height);
            ctx.lineTo(p4.x, p4.y - height);
            ctx.fill(); ctx.stroke();

            // Right Wall
            ctx.fillStyle = palSmall.right;
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p2.x, p2.y - height);
            ctx.lineTo(p3.x, p3.y - height);
            ctx.fill(); ctx.stroke();

            // Pitched Roof (Classic house look)
            const roofPeakH = 35;
            const center = isoToScreen(s.x + s.width / 2 - 0.5, s.y + s.height / 2 - 0.5);
            const peakX = center.x;
            const peakY = center.y - height - roofPeakH;

            // Roof Left
            ctx.fillStyle = palSmall.roofBase;
            ctx.beginPath();
            ctx.moveTo(p4.x, p4.y - height);
            ctx.lineTo(p3.x, p3.y - height);
            ctx.lineTo(peakX, peakY);
            ctx.fill(); ctx.stroke();

            // Roof Right
            ctx.fillStyle = palSmall.roofHighlight;
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y - height);
            ctx.lineTo(p2.x, p2.y - height);
            ctx.lineTo(peakX, peakY);
            ctx.fill(); ctx.stroke();

            // Door
            const dx = (p3.x - p4.x) * 0.3 + p4.x;
            const dy = (p3.y - p4.y) * 0.3 + p4.y;
            ctx.fillStyle = palSmall.door;
            ctx.beginPath();
            ctx.moveTo(dx - 6, dy - 3);
            ctx.lineTo(dx + 6, dy + 3);
            ctx.lineTo(dx + 6, dy - 20);
            ctx.lineTo(dx - 6, dy - 26);
            ctx.fill(); ctx.stroke();

            // Cute Window
            const wx = (p3.x - p4.x) * 0.75 + p4.x;
            const wy = (p3.y - p4.y) * 0.75 + p4.y - 12; // Lower
            const winLit = lightLevel < 0.6 && (hash % 100) > 30; // 70% chance lit residential during night

            ctx.beginPath();
            ctx.moveTo(wx - 7, wy - 3);
            ctx.lineTo(wx + 7, wy + 4);
            ctx.lineTo(wx + 7, wy - 8);
            ctx.lineTo(wx - 7, wy - 15);

            if (winLit) {
                ctx.save();
                ctx.fillStyle = '#FFE082'; // Warm light
                ctx.shadowColor = '#FFE082';
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.restore();
                ctx.stroke();
            } else {
                ctx.fillStyle = '#37474F'; // Dark blue
                ctx.fill();
                ctx.stroke();
            }

            // Cross bars on window
            ctx.strokeStyle = palSmall.left; // window frame matches house
            ctx.beginPath();
            ctx.moveTo(wx, wy - 13); ctx.lineTo(wx, wy + 2); // vertical
            ctx.moveTo(wx - 7, wy - 9); ctx.lineTo(wx + 6, wy - 2); // horizontal
            ctx.stroke();
        }
    }

    private drawFountain(ctx: CanvasRenderingContext2D, s: Structure, time: number) {
        // Isometric center of the 2x2 fountain
        const center = isoToScreen(s.x + s.width / 2 - 0.5, s.y + s.height / 2 - 0.5);
        const cx = center.x;
        const cy = center.y;

        // Draw Base Pool (Stone)
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 35, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner Pool (Water)
        ctx.fillStyle = '#0288D1';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 2, 30, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Animated Water Rings
        const ringScale = (time * 0.05) % 15;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 2, ringScale * 2, ringScale, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Center Pedestal
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(cx - 5, cy - 20, 10, 20);
        ctx.strokeRect(cx - 5, cy - 20, 10, 20);

        // Water Spout (Animated)
        const spoutHeight = 15 + Math.sin(time * 0.01) * 3;
        ctx.fillStyle = 'rgba(129, 212, 250, 0.8)'; // Light blue translucent

        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.quadraticCurveTo(cx - 10, cy - 20 - spoutHeight, cx - 15, cy - 5);
        ctx.quadraticCurveTo(cx - 5, cy - 20, cx, cy - 20);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.quadraticCurveTo(cx + 10, cy - 20 - spoutHeight, cx + 15, cy - 5);
        ctx.quadraticCurveTo(cx + 5, cy - 20, cx, cy - 20);
        ctx.fill();
    }

    private drawBench(ctx: CanvasRenderingContext2D, s: Structure) {
        const p = isoToScreen(s.x, s.y);
        const cx = p.x;
        const cy = p.y;

        const width = 30;
        const depth = 10;
        const height = 15;
        const legHeight = 8;

        // Seat
        ctx.fillStyle = '#6D4C41'; // Dark brown
        ctx.strokeStyle = '#4E342E'; // Even darker brown
        ctx.lineWidth = 1;

        // Top of the seat
        ctx.beginPath();
        ctx.moveTo(cx - width / 2, cy - depth / 2 - height);
        ctx.lineTo(cx + width / 2, cy - depth / 2 - height);
        ctx.lineTo(cx + width / 2 + depth / 2, cy - height);
        ctx.lineTo(cx - width / 2 + depth / 2, cy - height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Front face of the seat
        ctx.beginPath();
        ctx.moveTo(cx - width / 2, cy - depth / 2 - height);
        ctx.lineTo(cx + width / 2, cy - depth / 2 - height);
        ctx.lineTo(cx + width / 2, cy - depth / 2);
        ctx.lineTo(cx - width / 2, cy - depth / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right face of the seat
        ctx.beginPath();
        ctx.moveTo(cx + width / 2, cy - depth / 2 - height);
        ctx.lineTo(cx + width / 2 + depth / 2, cy - height);
        ctx.lineTo(cx + width / 2 + depth / 2, cy);
        ctx.lineTo(cx + width / 2, cy - depth / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Legs
        ctx.fillStyle = '#4E342E'; // Darker brown for legs
        ctx.strokeStyle = '#3E2723';

        // Front-left leg
        ctx.beginPath();
        ctx.moveTo(cx - width / 2 + 3, cy - depth / 2);
        ctx.lineTo(cx - width / 2 + 3, cy - depth / 2 + legHeight);
        ctx.lineTo(cx - width / 2 + 3 + depth / 2, cy + legHeight);
        ctx.lineTo(cx - width / 2 + 3 + depth / 2, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Front-right leg
        ctx.beginPath();
        ctx.moveTo(cx + width / 2 - 3, cy - depth / 2);
        ctx.lineTo(cx + width / 2 - 3, cy - depth / 2 + legHeight);
        ctx.lineTo(cx + width / 2 - 3 + depth / 2, cy + legHeight);
        ctx.lineTo(cx + width / 2 - 3 + depth / 2, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    private drawSoccerField(ctx: CanvasRenderingContext2D, s: Structure) {
        const tw = s.width;
        const th = s.height;

        // We use slightly offset coords so the field lies inside the tile footprint
        const pTop = isoToScreen(s.x, s.y);
        const pRight = isoToScreen(s.x + tw, s.y);
        const pBottom = isoToScreen(s.x + tw, s.y + th);
        const pLeft = isoToScreen(s.x, s.y + th);

        // Fill Grass Base darker
        ctx.fillStyle = '#388E3C'; // Darker/richer green
        ctx.beginPath();
        ctx.moveTo(pTop.x, pTop.y);
        ctx.lineTo(pRight.x, pRight.y);
        ctx.lineTo(pBottom.x, pBottom.y);
        ctx.lineTo(pLeft.x, pLeft.y);
        ctx.closePath();
        ctx.fill();

        // Draw Lines setup
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'miter';

        // Outer bounds (slightly inset)
        const inW = 0.2;
        const inH = 0.2;
        const oTop = isoToScreen(s.x + inW, s.y + inH);
        const oRight = isoToScreen(s.x + tw - inW, s.y + inH);
        const oBottom = isoToScreen(s.x + tw - inW, s.y + th - inH);
        const oLeft = isoToScreen(s.x + inW, s.y + th - inH);

        ctx.beginPath();
        ctx.moveTo(oTop.x, oTop.y);
        ctx.lineTo(oRight.x, oRight.y);
        ctx.lineTo(oBottom.x, oBottom.y);
        ctx.lineTo(oLeft.x, oLeft.y);
        ctx.closePath();
        ctx.stroke();

        // Halfway line (vertical in world space)
        const halfX = s.x + tw / 2;
        const c1 = isoToScreen(halfX, s.y + inH);
        const c2 = isoToScreen(halfX, s.y + th - inH);
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();

        // Center circle
        const cCenter = isoToScreen(halfX, s.y + th / 2);
        ctx.save();
        ctx.translate(cCenter.x, cCenter.y);
        ctx.scale(2, 1); // Isometric circle squash
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2); // 15px unscaled radius
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath(); ctx.arc(cCenter.x, cCenter.y, 2, 0, Math.PI * 2); ctx.fill();

        // Little Goals
        const drawGoal = (center: { x: number, y: number }, isLeft: boolean) => {
            // Isometric box for the net
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            const gw = 18; // goal visual width
            const gh = 18; // height

            ctx.beginPath();
            // front posts
            ctx.moveTo(center.x - gw / 2, center.y);
            ctx.lineTo(center.x - gw / 2, center.y - gh);
            ctx.moveTo(center.x + gw / 2, center.y);
            ctx.lineTo(center.x + gw / 2, center.y - gh);
            // crossbar
            ctx.moveTo(center.x - gw / 2, center.y - gh);
            ctx.lineTo(center.x + gw / 2, center.y - gh);
            ctx.stroke();

            // net back
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            const dirX = isLeft ? 10 : -10;
            const dirY = isLeft ? -5 : 5;

            ctx.beginPath();
            ctx.moveTo(center.x - gw / 2, center.y - gh);
            ctx.lineTo(center.x - gw / 2 + dirX, center.y - gh + dirY);
            ctx.lineTo(center.x + gw / 2 + dirX, center.y - gh + dirY);
            ctx.lineTo(center.x + gw / 2, center.y - gh);

            ctx.moveTo(center.x - gw / 2, center.y);
            ctx.lineTo(center.x - gw / 2 + dirX, center.y + dirY);

            ctx.moveTo(center.x + gw / 2, center.y);
            ctx.lineTo(center.x + gw / 2 + dirX, center.y + dirY);
            ctx.stroke();
        };

        drawGoal(isoToScreen(s.x, s.y + th / 2), true);
        drawGoal(isoToScreen(s.x + tw, s.y + th / 2), false);
    }

    private drawLampPostBase(ctx: CanvasRenderingContext2D, s: Structure, lightLevel: number, time: number) {
        const p = isoToScreen(s.x, s.y);
        const cx = p.x;
        const cy = p.y;

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(cx - 2, cy - 40, 4, 40);

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.fillRect(cx - 5, cy - 50, 10, 12);

        const isNight = lightLevel < 0.6;
        let hash = 0;
        for (let i = 0; i < s.id.length; i++) hash = (hash << 5) - hash + s.id.charCodeAt(i);

        // Subtle Flicker: 0.95 to 1.05
        const flicker = Math.sin(time * 3 + hash) * 0.05 + 1.0;

        const intensity = isNight ? Math.max(0, (0.6 - lightLevel) * 2) * flicker : 0;
        // Dimmer bulb color (warm white, not pure yellow)
        const bulbInfo = isNight ? `rgba(255, 240, 150, ${intensity * 0.8})` : '#AAA';

        ctx.fillStyle = bulbInfo;
        ctx.beginPath();
        ctx.fillRect(cx - 3, cy - 48, 6, 8);

        if (isNight && intensity > 0.1) {
            ctx.save();
            ctx.shadowColor = '#FFF096';
            ctx.shadowBlur = 20;
            ctx.fillStyle = `rgba(255, 240, 150, ${intensity * 0.5})`;
            ctx.fillRect(cx - 3, cy - 48, 6, 8);
            ctx.restore();
        }
    }

    private drawLampPostGlow(ctx: CanvasRenderingContext2D, s: Structure, lightLevel: number, time: number) {
        const isNight = lightLevel < 0.6;
        if (!isNight) return;

        let hash = 0;
        for (let i = 0; i < s.id.length; i++) hash = (hash << 5) - hash + s.id.charCodeAt(i);

        // Very subtle flicker for glow
        const flicker = Math.sin(time * 3 + hash) * 0.02 + 0.98;
        const baseIntensity = Math.max(0, (0.6 - lightLevel) * 2);

        // Global reduction of glow strength
        const intensity = baseIntensity * flicker * 0.6;

        if (intensity < 0.05) return;

        ctx.save();
        const p = isoToScreen(s.x, s.y);
        const cx = p.x;
        const cy = p.y - 45;

        ctx.globalCompositeOperation = 'screen';

        // Aumentando o raio (Radius) e a opacidade para um Glow mais expansivo pelo chao
        const radius = 100;
        const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius);

        // Soft, warm, transparent glow
        grad.addColorStop(0, `rgba(255, 210, 110, ${0.4 * intensity})`); // Core (mais amarelado/laranja)
        grad.addColorStop(0.3, `rgba(255, 170, 70, ${0.15 * intensity})`); // Mid
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    private drawWeather(ctx: CanvasRenderingContext2D, time: number) {
        if (this.weather === 'NONE') return;

        const count = this.weather === 'RAIN' ? 100 : 50;
        const speed = this.weather === 'RAIN' ? 0.8 : 0.2;

        ctx.save();
        const worldWidth = this.config.width * 64;
        const worldHeight = this.config.height * 32;

        if (this.weather === 'RAIN') {
            ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)'; // Chuva mais visível
            ctx.lineWidth = 1.5;
            for (let i = 0; i < count; i++) {
                const seed = i * 997;
                // Preencher tela cheia baseando-se no viewport imaginário
                const x = (seed + time * 0.1) % (worldWidth * 2) - worldWidth;
                const yStart = (seed * 1.5 + time * speed) % (worldHeight * 2) - worldHeight;

                ctx.beginPath();
                ctx.moveTo(x, yStart);
                ctx.lineTo(x - 8, yStart + 24); // Chuva mais longa e deitada
                ctx.stroke();
            }
        } else if (this.weather === 'SNOW') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (let i = 0; i < count; i++) {
                const seed = i * 1234;
                const x = (seed + Math.sin(time * 0.001 + seed) * 50) % worldWidth;
                const y = (seed * 0.8 + time * speed) % worldHeight;

                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}
