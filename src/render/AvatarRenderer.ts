import { type Camera } from '../engine/Camera';
import { type Creature } from '../world/EntityManager';
import { isoToScreen, TILE_WIDTH, TILE_HEIGHT } from '../engine/IsoMath';
import type { AvatarRig, AnimState, CosmeticSlot } from '../cosmetics/Types';

export class AvatarRenderer {
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    public draw(creature: Creature, camera: Camera, time: number) {
        // Unused variables: ctx is used via this.ctx in sub-methods, camera is unused here (used in world renderer transform)
        // We keep signature for potential future use or consistency, but remove unused locals.

        // Interpolate position
        let renderX = creature.x;
        let renderY = creature.y;

        if (creature.targetX !== undefined && creature.targetY !== undefined) {
            renderX = creature.x + (creature.targetX - creature.x) * creature.moveProgress;
            renderY = creature.y + (creature.targetY - creature.y) * creature.moveProgress;
        }

        const p = isoToScreen(renderX, renderY);
        const centerX = p.x;
        const centerY = p.y; // Ground level

        // Animation State
        const isMoving = creature.moveProgress > 0 && creature.targetX !== undefined;
        const idleFreq = 0.003;
        const walkFreq = 0.015;

        let bob = 0;
        if (isMoving) {
            bob = Math.sin(time * walkFreq + creature.animPhase) * 3;
        } else {
            bob = Math.sin(time * idleFreq + creature.animPhase) * 1.5;
        }

        // Shadow
        this.drawShadow(centerX, centerY);

        // RIG SETUP
        // Base height offset (floating slightly above shadow)
        const baseY = centerY - 15 - Math.abs(bob);

        const rig: AvatarRig = {
            x: centerX,
            y: baseY,
            scale: 1,
            anchors: {
                head: { x: centerX, y: baseY - 12 },
                eyes: { x: centerX, y: baseY - 12 },
                hat: { x: centerX, y: baseY - 18 },
                torso: { x: centerX, y: baseY },
                back: { x: centerX, y: baseY - 2 },
                legs: { x: centerX, y: baseY + 8 },
                feet: { x: centerX, y: baseY + 18 }
            }
        };

        const animState: AnimState = {
            time,
            isMoving,
            bob,
            facing: 'right' // TODO: Calculate facing based on movement delta
        };

        // DRAW LAYERS

        // 1. Back (Wings, Backpack)
        this.drawItem(creature, 'back', rig, animState);

        // 2. Body Base (Skin)
        this.drawBodyBase(rig, animState);

        // 3. Clothes (Bottom -> Top -> Shoes)
        this.drawItem(creature, 'bottom', rig, animState);
        this.drawItem(creature, 'top', rig, animState);
        this.drawItem(creature, 'shoes', rig, animState);

        // 4. Head/Face
        this.drawHeadBase(rig, animState);
        this.drawItem(creature, 'face', rig, animState);
        this.drawItem(creature, 'hat', rig, animState);

        // 5. Name Tag
        this.drawNameTag(centerX, baseY - 45, creature.name);
    }

    public drawHighlight(creature: Creature, type: 'selected' | 'hover') {
        // v0.8: Strict NO ground circles. Only pulsing arrow for selected.
        if (type !== 'selected') return;

        const { ctx } = this;
        const p = isoToScreen(creature.x, creature.y);
        const centerX = p.x;
        const centerY = p.y;
        const baseY = centerY - 15;

        ctx.save();
        ctx.translate(centerX, baseY);

        // Pulsing Arrow
        const bounce = Math.sin(Date.now() * 0.01) * 5;

        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        // Arrow pointing down at head
        ctx.moveTo(0, -60 + bounce);
        ctx.lineTo(-6, -75 + bounce);
        ctx.lineTo(6, -75 + bounce);
        ctx.fill();

        ctx.restore();
    }

    private drawItem(c: Creature, slot: CosmeticSlot, rig: AvatarRig, anim: AnimState) {
        const entry = c.loadout[slot];
        if (entry && entry.item) {
            entry.item.draw(this.ctx, rig, entry.style, anim);
        }
    }

    private drawShadow(x: number, y: number) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, TILE_WIDTH / 3.5, TILE_HEIGHT / 3.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    private drawBodyBase(rig: AvatarRig, anim: AnimState) {
        const { ctx } = this;
        const { x, y } = rig.anchors.torso;

        // Skin color
        ctx.fillStyle = '#ffdbac';

        // Torso
        ctx.fillRect(x - 6, y - 8, 12, 14);

        // Arms (simple)
        const armOffset = anim.isMoving ? Math.sin(anim.time * 0.015) * 4 : 0;
        ctx.fillRect(x - 9, y - 8 + armOffset, 3, 10); // Left
        ctx.fillRect(x + 6, y - 8 - armOffset, 3, 10); // Right

        // Neck
        ctx.fillRect(x - 2, y - 10, 4, 4);

        // Legs (if not covered by pants, but bottom item usually draws legs or pants)
        // We rely on 'bottom' item to draw legs for now to avoid z-fighting or double drawing
    }

    private drawHeadBase(rig: AvatarRig, anim: AnimState) {
        const { ctx } = this;
        const { x, y } = rig.anchors.head;

        // Head
        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (default if no face item overrides? or just draw underneath?)
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(x - 3, y + 1, 1, 0, Math.PI * 2);
        ctx.arc(x + 3, y + 1, 1, 0, Math.PI * 2);
        ctx.fill();
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
