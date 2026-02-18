import { RNG } from '../utils/RNG';
import { ALL_ITEMS, BACK_ITEMS, BOTTOM_ITEMS, FACE_ITEMS, HAT_ITEMS, SHOES_ITEMS, TOP_ITEMS } from './Catalog';
import type { CosmeticItem, CosmeticSlot, CosmeticStyle, Loadout, Rarity } from './Types';

// Palettes for procedural colors
const PALETTES = [
    ['#FF5252', '#FFEB3B'], // Red/Yellow
    ['#448AFF', '#B2EBF2'], // Blue/Cyan
    ['#69F0AE', '#B9F6CA'], // Green/Pale Green
    ['#E040FB', '#EA80FC'], // Purple
    ['#FF6E40', '#FF9E80'], // Orange
    ['#333333', '#9E9E9E'], // Black/Grey
    ['#FFFFFF', '#EEEEEE'], // White
];

function pickColor(rng: RNG): { primary: string, secondary: string } {
    const palette = rng.pick(PALETTES);
    // 50% chance to swap primary/secondary
    if (rng.nextFloat() > 0.5) {
        return { primary: palette[1], secondary: palette[0] };
    }
    return { primary: palette[0], secondary: palette[1] };
}

function pickItem(rng: RNG, items: CosmeticItem[]): CosmeticItem {
    // Simple rarity weights
    // Common: 60%, Rare: 30%, Epic: 9%, Legendary: 1%
    const roll = rng.nextFloat();
    let tier: Rarity = 'COMMON';

    if (roll > 0.99) tier = 'LEGENDARY';
    else if (roll > 0.90) tier = 'EPIC';
    else if (roll > 0.60) tier = 'RARE';

    // Filter items by tier (or lower if none found)
    let candidates = items.filter(i => i.rarity === tier);

    // Fallback to lower tiers if no item of that rarity exists
    if (candidates.length === 0) {
        candidates = items.filter(i => i.rarity === 'COMMON');
    }

    if (candidates.length === 0) return items[0]; // Should not happen

    return rng.pick(candidates);
}

export function generateLoadout(seed: number): Loadout {
    const rng = new RNG(seed);

    const slots: CosmeticSlot[] = ['hat', 'face', 'top', 'bottom', 'shoes', 'back'];
    const loadout: Partial<Loadout> = {};

    for (const slot of slots) {
        const items = ALL_ITEMS[slot];
        const item = pickItem(rng, items);
        const colors = pickColor(rng);

        loadout[slot] = {
            item,
            style: {
                primaryColor: colors.primary,
                secondaryColor: colors.secondary,
                pattern: rng.nextFloat() > 0.7 ? (rng.nextFloat() > 0.5 ? 'dots' : 'stripes') : undefined
            }
        };
    }

    return loadout as Loadout;
}
