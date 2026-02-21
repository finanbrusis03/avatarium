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

    public get structureManagerInstance() {
        return this.structureManager;
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

        // 1. Draw Terrain
        for (let x = 0; x < this.config.width; x++) {
            for (let y = 0; y < this.config.height; y++) {
                this.terrain.drawTile(ctx, x, y, time);
            }
        }

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
                this.terrain.drawProp(ctx, item.obj as Prop);
            } else if (item.type === 'STRUCTURE') {
                if (item.alpha && item.alpha < 1) {
                    ctx.save();
                    ctx.globalAlpha = item.alpha;
                    this.drawStructure(ctx, item.obj as Structure);
                    ctx.restore();
                } else {
                    this.drawStructure(ctx, item.obj as Structure);
                }
            } else if (item.type === 'LAMP_POST') {
                this.drawLampPostBase(ctx, item.obj as Structure, lightLevel, time);
            } else if (item.type === 'CREATURE') {
                const c = item.obj as Creature;
                if (c.id === selectedId) {
                    this.avatarRenderer.drawHighlight(c, 'selected');
                }
                this.avatarRenderer.draw(c, camera, time);
            }
        }

        // 4. Ambient Particles
        this.drawAmbientEffects(ctx, time, lightLevel, activeEvent);

        // 4.1 Global Particles (Spawn Poofs, etc)
        globalParticleSystem.update(16); // Approx 60fps delta
        globalParticleSystem.draw(ctx);

        // 4.2 Procedural Cloud Shadows
        this.drawClouds(ctx, time);

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
                // Transitions from 0 to 0.85 opacity as light level drops
                const nightAlpha = Math.min(0.85, (0.65 - lightLevel) / 0.45 * 0.85);
                ctx.fillStyle = `rgba(15, 15, 45, ${nightAlpha})`;
                ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            }

            ctx.restore();
        }

        // 6. Draw GLOWS (Post-Overlay)
        // Re-apply camera transform
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        // Glow pass
        for (const lamp of lampPosts) {
            this.drawLampPostGlow(ctx, lamp, lightLevel, time);
        }

        ctx.restore();

        // Final cleanup
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    private drawAmbientEffects(ctx: CanvasRenderingContext2D, time: number, lightLevel: number, activeEvent: string | null) {
        const isNight = lightLevel < 0.4;
        const baseParticles = 20;
        const eventMult = activeEvent === 'LIGHTS_NIGHT' ? 3 : 1;
        const particleCount = isNight ? baseParticles * 2 * eventMult : baseParticles * 0.5;
        const bounds = Math.max(this.config.width, this.config.height);

        ctx.fillStyle = activeEvent === 'FESTIVAL' ? '#FFD700' : '#CDDC39';

        for (let i = 0; i < particleCount; i++) {
            const seed = i * 1337;
            const speed = 0.0005;
            const t = time * speed + seed; // Use stable time

            let gridX, gridY;
            if (activeEvent === 'FESTIVAL') {
                const radius = (Math.sin(t * 2) + 2) * 5;
                gridX = (this.config.width / 2) + Math.cos(t * 5 + i) * radius;
                gridY = (this.config.height / 2) + Math.sin(t * 5 + i) * radius;
            } else {
                gridX = (Math.sin(t) * 0.5 + 0.5) * bounds;
                gridY = (Math.cos(t * 0.7 + seed) * 0.5 + 0.5) * bounds;
            }

            const p = isoToScreen(gridX, gridY);
            const floatY = Math.sin(time * 0.002 + i) * 20 - 30;
            const alpha = (Math.sin(time * 0.005 + i) + 1) / 2 * (isNight ? 0.8 : 0.2);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y + floatY, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    private drawClouds(ctx: CanvasRenderingContext2D, time: number) {
        // Draw large moving shadows across the world
        const cloudCount = 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; // Very subtle shadow

        const worldPixelWidth = this.config.width * 64 * 2; // Rough bounds
        const worldPixelHeight = this.config.height * 32 * 2;

        ctx.save();
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

    private drawStructure(ctx: CanvasRenderingContext2D, s: Structure) {
        // const p = isoToScreen(s.x, s.y); // Unused

        const wh = 70 + (s.type === 'HOUSE_MEDIUM' ? 30 : 0);

        // Actually p1 is unused by lint, but let's keep logic clear if we ever need debug. 
        // Linter complained about p1. Let's just use what we need.
        // p2, p3, p4 are used.

        const p2 = isoToScreen(s.x + s.width - 0.5, s.y - 0.5); // Right
        const p3 = isoToScreen(s.x + s.width - 0.5, s.y + s.height - 0.5); // Bottom/Front
        const p4 = isoToScreen(s.x - 0.5, s.y + s.height - 0.5); // Left

        const wallDark = '#5D4037';
        const wallLight = '#8D6E63';
        const roofColor = '#D32F2F';
        const roofLight = '#E57373';

        // Ambient Occlusion / Base Shadow (Faux drop shadow on the ground)
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.moveTo(p4.x - 10, p4.y + 5);
        ctx.lineTo(p3.x, p3.y + 10);
        ctx.lineTo(p2.x + 10, p2.y + 5);
        ctx.lineTo(p2.x, p2.y - 10); // taper off
        ctx.lineTo(p4.x, p4.y - 10);
        ctx.fill();

        // Left Wall
        ctx.fillStyle = wallDark;
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - wh);
        ctx.lineTo(p4.x, p4.y - wh);
        ctx.fill();
        ctx.stroke();

        // Right Wall
        ctx.fillStyle = wallLight;
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x, p2.y - wh);
        ctx.lineTo(p3.x, p3.y - wh);
        ctx.fill();
        ctx.stroke();

        // Roof
        const roofPeakH = 40;
        const center = isoToScreen(s.x + s.width / 2 - 0.5, s.y + s.height / 2 - 0.5);
        const peakX = center.x;
        const peakY = center.y - wh - roofPeakH;

        ctx.fillStyle = roofLight;
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y - wh);
        ctx.lineTo(p3.x, p3.y - wh);
        ctx.lineTo(peakX, peakY);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = roofColor;
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y - wh);
        ctx.lineTo(p2.x, p2.y - wh);
        ctx.lineTo(peakX, peakY);
        ctx.fill();
        ctx.stroke();

        if (s.type === 'HOUSE_SMALL' || s.type === 'HOUSE_MEDIUM') {
            const doorW = 14;
            const doorH = 25;
            const dx = (p3.x - p4.x) * 0.5 + p4.x;
            const dy = (p3.y - p4.y) * 0.5 + p4.y;

            ctx.fillStyle = '#3E2723';
            ctx.fillRect(dx - doorW / 2, dy - doorH, doorW, doorH);
        }
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
        ctx.fillRect(cx - 3, cy - 48, 6, 8);
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

        // Reduced Radius: 70px (was 120+ implied)
        const radius = 70;
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);

        // Soft, warm, transparent glow
        grad.addColorStop(0, `rgba(255, 220, 160, ${0.18 * intensity})`); // Core
        grad.addColorStop(0.4, `rgba(255, 180, 100, ${0.08 * intensity})`); // Mid
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
