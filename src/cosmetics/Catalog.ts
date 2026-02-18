import type { CosmeticItem, CosmeticSlot } from './Types';

// --- Helper for drawing patterns ---
// function applyPattern(ctx: CanvasRenderingContext2D, style: CosmeticStyle, x: number, y: number, width: number, height: number) {
//     if (style.pattern === 'dots') {
//         ctx.fillStyle = 'rgba(255,255,255,0.3)';
//         for (let i = 0; i < 5; i++) {
//             ctx.beginPath();
//             ctx.arc(x + Math.random() * width, y + Math.random() * height, 1, 0, Math.PI * 2);
//             ctx.fill();
//         }
//     } else if (style.pattern === 'stripes') {
//         ctx.strokeStyle = 'rgba(255,255,255,0.2)';
//         ctx.lineWidth = 2;
//         ctx.beginPath();
//         ctx.moveTo(x, y);
//         ctx.lineTo(x + width, y + height);
//         ctx.stroke();
//     }
// }

// --- CATALOG ---

export const BACK_ITEMS: CosmeticItem[] = [
    {
        id: 'none', slot: 'back', rarity: 'COMMON',
        draw: () => { }
    },
    {
        id: 'backpack', slot: 'back', rarity: 'COMMON',
        draw: (ctx, rig, style) => {
            const { x, y } = rig.anchors.back;
            ctx.fillStyle = style.primaryColor;
            ctx.fillRect(x - 8, y - 8, 16, 20);
            ctx.fillStyle = style.secondaryColor;
            ctx.fillRect(x - 6, y - 4, 12, 10);
        }
    },
    {
        id: 'wings', slot: 'back', rarity: 'RARE',
        draw: (ctx, rig, style, anim) => {
            const { x, y } = rig.anchors.back;
            // Flapping anim
            const flap = Math.sin(anim.time * 0.01) * 5;

            ctx.fillStyle = style.primaryColor;
            // Left Wing
            ctx.beginPath();
            ctx.moveTo(x - 4, y);
            ctx.quadraticCurveTo(x - 20, y - 10 + flap, x - 25, y + 10);
            ctx.quadraticCurveTo(x - 10, y + 10, x - 4, y + 5);
            ctx.fill();

            // Right Wing
            ctx.beginPath();
            ctx.moveTo(x + 4, y);
            ctx.quadraticCurveTo(x + 20, y - 10 + flap, x + 25, y + 10);
            ctx.quadraticCurveTo(x + 10, y + 10, x + 4, y + 5);
            ctx.fill();
        }
    }
];

export const BOTTOM_ITEMS: CosmeticItem[] = [
    {
        id: 'pants', slot: 'bottom', rarity: 'COMMON',
        draw: (ctx, rig, style, anim) => {
            const { x, y } = rig.anchors.legs;
            ctx.fillStyle = style.primaryColor;

            // Simple legs
            const legW = 6;
            const legH = 12;
            const separation = 4;

            // Anim offset for walking
            const walkOffset = anim.isMoving ? Math.sin(anim.time * 0.015) * 3 : 0;

            // Left leg
            ctx.fillRect(x - separation - legW / 2, y, legW, legH + walkOffset);

            // Right leg
            ctx.fillRect(x + separation - legW / 2, y, legW, legH - walkOffset);

            // Waist
            ctx.fillRect(x - 8, y - 4, 16, 6);
        }
    },
    {
        id: 'shorts', slot: 'bottom', rarity: 'COMMON',
        draw: (ctx, rig, style, anim) => {
            const { x, y } = rig.anchors.legs;
            ctx.fillStyle = style.primaryColor;
            const legW = 6;
            const legH = 6; // Shorter
            const separation = 4;
            const walkOffset = anim.isMoving ? Math.sin(anim.time * 0.015) * 3 : 0;

            ctx.fillRect(x - separation - legW / 2, y, legW, legH + walkOffset);
            ctx.fillRect(x + separation - legW / 2, y, legW, legH - walkOffset);
            ctx.fillRect(x - 8, y - 4, 16, 6);

            // Skin legs below
            ctx.fillStyle = '#ffdbac'; // Hardcoded skin tone for now (should be prop)
            ctx.fillRect(x - separation - legW / 2 + 1, y + legH + walkOffset, 4, 6);
            ctx.fillRect(x + separation - legW / 2 + 1, y + legH - walkOffset, 4, 6);
        }
    }
];

export const SHOES_ITEMS: CosmeticItem[] = [
    {
        id: 'sneakers', slot: 'shoes', rarity: 'COMMON',
        draw: (ctx, rig, style, anim) => {
            const { x, y } = rig.anchors.feet;
            const walkOffset = anim.isMoving ? Math.sin(anim.time * 0.015) * 3 : 0;
            const footY = y + 8;

            ctx.fillStyle = style.primaryColor;
            // Left
            ctx.fillRect(x - 8, footY + walkOffset, 8, 5);
            // Right
            ctx.fillRect(x + 0, footY - walkOffset, 8, 5); // Aligned with right foot x+1

            // Laces detail
            ctx.fillStyle = 'white';
            ctx.fillRect(x - 6, footY + walkOffset, 4, 1);
            ctx.fillRect(x + 2, footY - walkOffset, 4, 1);
        }
    },
    {
        id: 'boots', slot: 'shoes', rarity: 'RARE',
        draw: (ctx, rig, style, anim) => {
            const { x, y } = rig.anchors.feet;
            const walkOffset = anim.isMoving ? Math.sin(anim.time * 0.015) * 3 : 0;
            const footY = y + 7;

            ctx.fillStyle = style.primaryColor;
            ctx.fillRect(x - 8, footY + walkOffset, 8, 7);
            ctx.fillRect(x + 0, footY - walkOffset, 8, 7);
        }
    }
];

export const TOP_ITEMS: CosmeticItem[] = [
    {
        id: 'tshirt', slot: 'top', rarity: 'COMMON',
        draw: (ctx, rig, style) => {
            const { x, y } = rig.anchors.torso;
            ctx.fillStyle = style.primaryColor;
            // Torso
            ctx.fillRect(x - 9, y - 10, 18, 16);
            // Sleeves
            ctx.fillRect(x - 13, y - 10, 4, 8); // Left
            ctx.fillRect(x + 9, y - 10, 4, 8);  // Right

            // Logo/Pattern
            if (style.secondaryColor) {
                ctx.fillStyle = style.secondaryColor;
                ctx.beginPath();
                ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },
    {
        id: 'hoodie', slot: 'top', rarity: 'RARE',
        draw: (ctx, rig, style) => {
            const { x, y } = rig.anchors.torso;
            ctx.fillStyle = style.primaryColor;
            // Torso (bulky)
            ctx.fillRect(x - 10, y - 10, 20, 18);
            // Sleeves (long)
            ctx.fillRect(x - 14, y - 10, 4, 14);
            ctx.fillRect(x + 10, y - 10, 4, 14);

            // Pocket
            ctx.fillStyle = style.secondaryColor;
            ctx.fillRect(x - 6, y + 2, 12, 4);

            // Hood bits around neck
            ctx.fillStyle = style.primaryColor;
            ctx.beginPath();
            ctx.moveTo(x - 6, y - 10);
            ctx.lineTo(x, y - 8);
            ctx.lineTo(x + 6, y - 10);
            ctx.stroke();
        }
    }
];

export const FACE_ITEMS: CosmeticItem[] = [
    {
        id: 'none', slot: 'face', rarity: 'COMMON',
        draw: () => { }
    },
    {
        id: 'glasses', slot: 'face', rarity: 'COMMON',
        draw: (ctx, rig, style) => {
            const { x, y } = rig.anchors.eyes;
            ctx.fillStyle = style.primaryColor;
            // Rim
            ctx.fillRect(x - 8, y - 2, 6, 4);
            ctx.fillRect(x + 2, y - 2, 6, 4);
            ctx.moveTo(x - 2, y);
            ctx.lineTo(x + 2, y);
            ctx.strokeStyle = style.primaryColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Lens opacity
            ctx.fillStyle = 'rgba(200, 255, 255, 0.4)';
            ctx.fillRect(x - 7, y - 1, 4, 2);
            ctx.fillRect(x + 3, y - 1, 4, 2);
        }
    },
    {
        id: 'mask', slot: 'face', rarity: 'EPIC',
        draw: (ctx, rig, style) => {
            const { x, y } = rig.anchors.head; // Anchor on head center
            ctx.fillStyle = style.primaryColor;
            ctx.beginPath();
            ctx.roundRect(x - 8, y + 2, 16, 10, 4);
            ctx.fill();

            // Straps
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - 8, y + 4);
            ctx.lineTo(x - 10, y + 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 8, y + 4);
            ctx.lineTo(x + 10, y + 2);
            ctx.stroke();
        }
    }
];

export const HAT_ITEMS: CosmeticItem[] = [
    {
        id: 'none', slot: 'hat', rarity: 'COMMON',
        draw: () => { }
    },
    {
        id: 'cap', slot: 'hat', rarity: 'COMMON',
        draw: (ctx, rig, style) => {
            const { x, y } = rig.anchors.hat;
            ctx.fillStyle = style.primaryColor;
            // Dome
            ctx.beginPath();
            ctx.arc(x, y, 9, Math.PI, 0); // Half circle
            ctx.fill();
            // Bill (Visor)
            ctx.fillStyle = style.secondaryColor;
            ctx.beginPath();
            ctx.rect(x - 9, y - 2, 18, 4);
            ctx.fill();
        }
    },
    {
        id: 'crown', slot: 'hat', rarity: 'LEGENDARY',
        draw: (ctx, rig, _style) => {
            const { x, y } = rig.anchors.hat;
            ctx.fillStyle = 'gold'; // Always gold? Or style.primaryColor?
            // Base
            ctx.fillRect(x - 8, y - 6, 16, 4);
            // Spikes
            ctx.beginPath();
            ctx.moveTo(x - 8, y - 6);
            ctx.lineTo(x - 8, y - 12);
            ctx.lineTo(x - 4, y - 6);
            ctx.lineTo(x, y - 12);
            ctx.lineTo(x + 4, y - 6);
            ctx.lineTo(x + 8, y - 12);
            ctx.lineTo(x + 8, y - 6);
            ctx.fill();

            // Gems
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(x, y - 4, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    {
        id: 'halo', slot: 'hat', rarity: 'LEGENDARY',
        draw: (ctx, rig, _style, anim) => {
            const { x, y } = rig.anchors.hat;
            const float = Math.sin(anim.time * 0.005) * 3;
            ctx.strokeStyle = '#FFFFE0'; // Light yellow
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x, y - 15 + float, 10, 3, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
];

export const ALL_ITEMS: Record<CosmeticSlot, CosmeticItem[]> = {
    back: BACK_ITEMS,
    bottom: BOTTOM_ITEMS,
    shoes: SHOES_ITEMS,
    top: TOP_ITEMS,
    face: FACE_ITEMS,
    hat: HAT_ITEMS
};
