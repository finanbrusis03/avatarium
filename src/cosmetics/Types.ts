export type CosmeticSlot = 'hat' | 'face' | 'top' | 'bottom' | 'shoes' | 'back';

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface CosmeticItem {
    id: string;
    slot: CosmeticSlot;
    rarity: Rarity;
    // Draw function signature
    draw: (ctx: CanvasRenderingContext2D, rig: AvatarRig, style: CosmeticStyle, anim: AnimState) => void;
}

export interface CosmeticStyle {
    primaryColor: string;
    secondaryColor: string;
    pattern?: string; // 'dots', 'stripes', 'solid'
}

export type Loadout = Record<CosmeticSlot, { item: CosmeticItem, style: CosmeticStyle }>;

// Animation State passed to draw functions
export interface AnimState {
    time: number;
    isMoving: boolean;
    bob: number;
    facing: 'left' | 'right'; // For future use, mostly isometric assumption now
}

// Rig / Anchors for positioning
export interface AvatarRig {
    x: number;
    y: number;
    scale: number;

    // Relative anchors (offsets from x,y)
    anchors: {
        head: { x: number, y: number };
        eyes: { x: number, y: number };
        hat: { x: number, y: number };
        torso: { x: number, y: number };
        back: { x: number, y: number }; // Backpack/Wings
        legs: { x: number, y: number };
        feet: { x: number, y: number };
    }
}
