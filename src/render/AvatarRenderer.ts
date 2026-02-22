import { type Camera } from '../engine/Camera';
import { type Creature } from '../world/EntityManager';
import { isoToScreen } from '../engine/IsoMath';
import type { AvatarRig, AnimState, CosmeticSlot } from '../cosmetics/Types';
import { globalParticleSystem } from '../engine/ParticleSystem';

export class AvatarRenderer {
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    public draw(creature: Creature, _camera: Camera, time: number, lightLevel: number = 1.0) {
        const { ctx } = this;
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

        // Spawn Animation Logic
        let scale = 0.60; // REDUCED AGAIN (from 0.72) to 0.60
        let alpha = 1;
        const now = Date.now();

        if (creature.isSpawning && creature.spawnTime) {
            const duration = creature.spawnDuration || 600;
            const elapsed = now - creature.spawnTime;
            const progress = Math.min(1, elapsed / duration);

            if (progress < 1) {
                // easeOutBack
                const c1 = 1.70158;
                const c3 = c1 + 1;
                const x = progress;
                const easeOutBack = 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);

                scale = (0.6 + easeOutBack * 0.4) * 0.60; // Apply exact base scale
                alpha = progress;

                // Emit particles only once
                if (!creature.hasEmittedSpawn) {
                    globalParticleSystem.emit(centerX, centerY, 12);
                    creature.hasEmittedSpawn = true;
                    console.log(`Spawn triggered for avatar ${creature.name}`);
                }
            } else {
                // End spawning state locally (the world loop should handle this but safety first)
                creature.isSpawning = false;
            }
        }

        this.ctx.save();
        if (scale !== 1 || alpha !== 1) {
            this.ctx.translate(centerX, centerY);
            this.ctx.scale(scale, scale);
            this.ctx.globalAlpha = alpha;
            this.ctx.translate(-centerX, -centerY);
        }

        const isMoving = creature.moveProgress > 0 && creature.targetX !== undefined;
        const isSitting = creature.state === 'SITTING';
        const heightMultiplier = isSitting ? 0.8 : 1.0;
        const groundOffset = isSitting ? 5 : 0;

        const idleFreq = 0.003;
        const walkFreq = 0.015;

        let bob = 0;
        if (isMoving) {
            bob = Math.sin(time * walkFreq + creature.animPhase) * 3;
        } else if (!isSitting) {
            bob = Math.sin(time * idleFreq + creature.animPhase) * 1.5;
        }

        // Shadow
        this.drawShadow(centerX, centerY, time, lightLevel);

        // RIG SETUP
        const baseY = centerY - 15 - Math.abs(bob) + groundOffset;
        const finalY = baseY;

        const rig: AvatarRig = {
            x: centerX,
            y: baseY,
            scale: 1,
            anchors: {
                head: { x: centerX, y: baseY - (12 * heightMultiplier) },
                eyes: { x: centerX, y: baseY - (12 * heightMultiplier) },
                hat: { x: centerX, y: baseY - (18 * heightMultiplier) },
                torso: { x: centerX, y: baseY },
                back: { x: centerX, y: baseY - (2 * heightMultiplier) },
                legs: { x: centerX, y: baseY + 8 },
                feet: { x: centerX, y: baseY + 18 }
            }
        };

        const animState: AnimState = {
            time,
            isMoving,
            bob,
            facing: 'right'
        };

        // DRAW LAYERS
        this.drawItem(creature, 'back', rig, animState);
        this.drawBodyBase(creature, rig, animState, isSitting, heightMultiplier, finalY);
        this.drawItem(creature, 'bottom', rig, animState);
        this.drawItem(creature, 'top', rig, animState);

        // 3.2 Braços (Após o top para não ficar escondido)
        this.drawArms(creature, rig, animState, isSitting, heightMultiplier, finalY);

        this.drawItem(creature, 'shoes', rig, animState);
        this.drawFeet(creature, rig, animState);
        this.drawHeadBase(creature, rig, animState);
        this.drawItem(creature, 'face', rig, animState);
        if (creature.gender !== 'F') {
            this.drawItem(creature, 'hat', rig, animState);
        }

        // 5. Name Tag
        this.drawNameTag(centerX, baseY - 45, creature.name);

        // 6. Chat Bubble
        if (creature.currentChat && creature.chatExpires && Date.now() < creature.chatExpires) {
            this.drawChatBubble(centerX, baseY - 55, creature.currentChat);
        }

        ctx.restore();
    }

    public drawHighlight(creature: Creature, type: 'selected' | 'hover') {
        if (type !== 'selected') return;

        const { ctx } = this;
        const p = isoToScreen(creature.x, creature.y);
        const centerX = p.x;
        const centerY = p.y;
        const baseY = centerY - 15;

        ctx.save();
        ctx.translate(centerX, baseY);

        const bounce = Math.sin(Date.now() * 0.01) * 5;
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
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

    private drawShadow(x: number, y: number, time: number, lightLevel: number) {
        const sunAngle = (time * 0.0001) % (Math.PI * 2);
        const shadowOpacity = Math.max(0, (lightLevel - 0.4)) * 0.4;
        const shadowLen = 15 + (1 - lightLevel) * 20;

        this.ctx.save();
        this.ctx.fillStyle = `rgba(0,0,0,${shadowOpacity})`;
        this.ctx.translate(x, y);
        this.ctx.rotate(sunAngle);

        this.ctx.beginPath();
        this.ctx.ellipse(shadowLen / 2, 0, shadowLen / 2, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    private drawBodyBase(c: Creature, rig: AvatarRig, _anim: AnimState, isSitting: boolean, heightMultiplier: number, finalY: number) {
        const { ctx } = this;
        const { x } = rig.anchors.torso;

        // Skin color
        ctx.fillStyle = '#ffdbac';

        // Idle breathing scale modifier
        const breathScale = _anim.isMoving ? 1 : 1 + Math.sin(_anim.time * 0.003 + Math.abs(x)) * 0.06;

        ctx.save();
        ctx.translate(x, finalY);
        if (isSitting) {
            ctx.scale(1.05, heightMultiplier); // Slightly wider and shorter
        }
        ctx.scale(1, breathScale);

        // Torso
        if (c.gender === 'F') {
            ctx.beginPath();
            ctx.moveTo(-6, -8);
            ctx.lineTo(6, -8);
            ctx.lineTo(5, 6);
            ctx.lineTo(-5, 6);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(-6, -8, 12, 14);
        }
        ctx.restore();

        // Neck
        ctx.fillRect(x - 2, finalY - 10 * heightMultiplier, 4, 4 * heightMultiplier); // Adjust neck position and height
    }

    private drawArms(_c: Creature, rig: AvatarRig, anim: AnimState, _isSitting: boolean, heightMultiplier: number, finalY: number) {
        const { ctx } = this;
        const { x } = rig.anchors.torso; // Only need x from rig.anchors.torso now

        ctx.fillStyle = '#ffdbac';
        const armSwing = anim.isMoving ? Math.sin(anim.time * 0.015) * 8 : 4;

        // Left Arm (Aligned with sleeve)
        ctx.save();
        ctx.translate(x - 11, finalY - 6 * heightMultiplier); // Use finalY and heightMultiplier
        ctx.rotate(armSwing * Math.PI / 180);
        ctx.fillRect(-2, 0, 3, 8 * heightMultiplier); // Upper Arm, scale height
        ctx.fillRect(-2, 8 * heightMultiplier, 4, 3 * heightMultiplier); // Hand, scale height
        ctx.restore();

        // Right Arm
        ctx.save();
        ctx.translate(x + 11, finalY - 6 * heightMultiplier);
        ctx.rotate(-armSwing * Math.PI / 180);
        ctx.fillRect(-1, 0, 3, 8 * heightMultiplier); // Upper Arm
        ctx.fillRect(-1, 8 * heightMultiplier, 4, 3 * heightMultiplier); // Hand
        ctx.restore();
    }

    private drawFeet(_c: Creature, rig: AvatarRig, anim: AnimState) {
        const { ctx } = this;
        const { x, y } = rig.anchors.feet;

        ctx.fillStyle = '#ffdbac';
        const walkOffset = anim.isMoving ? Math.sin(anim.time * 0.015) * 3 : 0;

        // Draw feet slightly higher to align with standard shoes logic
        const footY = y + 8;

        // Left Foot
        ctx.fillRect(x - 6, footY + walkOffset, 5, 3);
        // Right Foot
        ctx.fillRect(x + 1, footY - walkOffset, 5, 3);
    }

    private drawHeadBase(c: Creature, rig: AvatarRig, _anim: AnimState) {
        const { ctx } = this;
        const { x, y } = rig.anchors.head;

        // Head
        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();

        // Simple Gender differentiation: Long hair for F, short for M (standard fallback)
        if (c.gender === 'F') {
            ctx.fillStyle = '#F8E08E'; // Blonde (Loiro)
            ctx.beginPath();
            ctx.arc(x, y - 2, 10, Math.PI, Math.PI * 2); // Top hair
            ctx.fillRect(x - 10, y - 2, 4, 12); // Left side
            ctx.fillRect(x + 6, y - 2, 4, 12); // Right side
            ctx.fill();
        } else {
            // Short hair/Cap style
            ctx.fillStyle = '#3e2723';
            ctx.beginPath();
            ctx.arc(x, y - 1, 9.5, Math.PI * 1.1, Math.PI * 1.9);
            ctx.fill();
        }

        // Eyes
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(x - 3, y + 1, 1, 0, Math.PI * 2);
        ctx.arc(x + 3, y + 1, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawNameTag(x: number, y: number, name: string) {
        const { ctx } = this;

        ctx.font = 'bold 12px sans-serif';
        const measure = ctx.measureText(name);
        const w = measure.width + 16;
        const h = 20;

        // Rich background pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        // Fallback for roundRect just in case, though modern browsers support it
        if (ctx.roundRect) {
            ctx.roundRect(x - w / 2, y - h + 5, w, h, 10);
        } else {
            ctx.rect(x - w / 2, y - h + 5, w, h);
        }
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        ctx.textAlign = 'center';
        // Base alignment tweak since it's inside a pill now
        ctx.fillText(name, x, y);
    }

    private drawChatBubble(x: number, y: number, text: string) {
        const { ctx } = this;
        ctx.font = '14px sans-serif';
        const maxWidth = 180;

        // Simple word wrap
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const w = ctx.measureText(currentLine + " " + words[i]).width;
            if (w < maxWidth) {
                currentLine += " " + words[i];
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
        lines.push(currentLine);

        const lineHeight = 18;
        const bubbleW = Math.min(maxWidth + 20, Math.max(...lines.map(l => ctx.measureText(l).width)) + 20);
        const bubbleH = lines.length * lineHeight + 12;
        const bx = x - bubbleW / 2;
        const by = y - bubbleH - 10;

        ctx.save();

        // Shadow
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';

        // Bubble body
        ctx.fillStyle = 'white';
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(bx, by, bubbleW, bubbleH, 8);
            ctx.fill();
        } else {
            ctx.fillRect(bx, by, bubbleW, bubbleH);
        }

        // Tail
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 10);
        ctx.lineTo(x + 6, y - 10);
        ctx.lineTo(x, y - 4);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';

        lines.forEach((line, i) => {
            ctx.fillText(line, x, by + 18 + i * lineHeight);
        });

        ctx.restore();
    }
}
