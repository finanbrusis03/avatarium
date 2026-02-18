import { type Camera } from '../engine/Camera';
import { type Creature } from '../world/EntityManager';
import { isoToScreen, TILE_WIDTH, TILE_HEIGHT } from '../engine/IsoMath';

export class CreatureRenderer {
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    public draw(creature: Creature, _camera: Camera, time: number) {
        // const { ctx } = this; // Unused local

        // Interpolate position
        let renderX = creature.x;
        let renderY = creature.y;

        if (creature.targetX !== undefined && creature.targetY !== undefined) {
            renderX = creature.x + (creature.targetX - creature.x) * creature.moveProgress;
            renderY = creature.y + (creature.targetY - creature.y) * creature.moveProgress;
        }

        const p = isoToScreen(renderX, renderY);

        // Apply Camera Transform (Manual, or assume context is already transformed? 
        // WorldRenderer transforms the context, so here we assume local coords are relevant if we were drawing in world space.
        // BUT WorldRenderer translates to center and scales. So 'p' is in world pixels.
        // If context is already transformed by camera, we just draw at 'p'.

        // Animation: Idle Bob & Walk
        const isMoving = creature.moveProgress > 0;
        const idleFreq = 0.003;
        const walkFreq = 0.015;

        let bob = 0;
        if (isMoving) {
            // Walk cycle bob (staccato or sine)
            bob = Math.sin(time * walkFreq + creature.animPhase) * 4;
        } else {
            // Idle breathing
            bob = Math.sin(time * idleFreq + creature.animPhase) * 2;
        }

        const centerX = p.x;
        const centerY = p.y - 15 - Math.abs(bob); // Float above tile

        this.drawShadow(centerX, p.y);
        this.drawBody(centerX, centerY, creature, isMoving, time);
        this.drawFace(centerX, centerY);
        this.drawAccessory(centerX, centerY, creature);
        this.drawNameTag(centerX, p.y - 50 - Math.abs(bob), creature.name);
    }

    private drawShadow(x: number, y: number) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, TILE_WIDTH / 3, TILE_HEIGHT / 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    private drawBody(x: number, y: number, c: Creature, moving: boolean, time: number) {
        const { ctx } = this;
        ctx.fillStyle = c.primaryColor || '#FFF';

        // Simple shape variations based on bodyType
        ctx.beginPath();
        if (c.bodyType === 0) {
            // Round
            ctx.arc(x, y, 12, 0, Math.PI * 2);
        } else if (c.bodyType === 1) {
            // Square-ish
            ctx.roundRect(x - 11, y - 11, 22, 22, 6);
        } else {
            // Tall
            ctx.ellipse(x, y - 2, 10, 14, 0, 0, Math.PI * 2);
        }
        ctx.fill();

        // Secondary color detail (belly/pattern)
        ctx.fillStyle = c.secondaryColor || '#EEE';
        ctx.beginPath();
        ctx.arc(x, y + 5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Legs (simple lines or small circles)
        if (moving) {
            const legOffset = Math.sin(time * 0.02) * 3;
            ctx.fillStyle = '#333'; // Dark legs
            ctx.beginPath();
            ctx.arc(x - 5, y + 12 + legOffset, 3, 0, Math.PI * 2); // Left
            ctx.arc(x + 5, y + 12 - legOffset, 3, 0, Math.PI * 2); // Right
            ctx.fill();
        }
    }

    private drawFace(x: number, y: number) {
        const { ctx } = this;
        ctx.fillStyle = '#FFF';

        // Eyes
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 3, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 1, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawAccessory(x: number, y: number, c: Creature) {
        const { ctx } = this;
        ctx.fillStyle = c.secondaryColor || '#EEE';

        const type = c.accessoryType;
        if (type === 0) {
            // Hat
            ctx.fillRect(x - 12, y - 14, 24, 4);
            ctx.fillRect(x - 8, y - 22, 16, 8);
        } else if (type === 1) {
            // Horns
            ctx.beginPath();
            ctx.moveTo(x - 8, y - 10);
            ctx.lineTo(x - 14, y - 20);
            ctx.lineTo(x - 4, y - 10);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x + 8, y - 10);
            ctx.lineTo(x + 14, y - 20);
            ctx.lineTo(x + 4, y - 10);
            ctx.fill();
        } else if (type === 2) {
            // Antenna
            ctx.beginPath();
            ctx.moveTo(x, y - 12);
            ctx.lineTo(x, y - 22);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y - 24, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        // ... others can be empty or repeats
    }

    private drawNameTag(x: number, y: number, name: string) {
        const { ctx } = this;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.roundRect(x - 20, y - 10, 40, 14, 4);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name, x, y);
    }
}
