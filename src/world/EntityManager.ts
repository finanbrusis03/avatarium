// import { type Point } from '../engine/IsoMath'; // Unused
import { generateUUID } from '../engine/Utils';
import { stringToHash } from '../utils/Hash';
import { RNG } from '../utils/RNG';
import type { Loadout } from '../cosmetics/Types';
import { generateLoadout } from '../cosmetics/Generator';

export type Temperament = 'SHY' | 'SOCIAL' | 'EXPLORER';
export type CreatureState = 'IDLE' | 'MOVING' | 'SITTING';

export interface Creature {
    id: string;
    name: string;
    x: number; // Grid X
    y: number; // Grid Y
    color: string; // Added from snippet

    // Movement State
    targetX?: number; // Target Grid X for movement
    targetY?: number; // Target Grid Y for movement
    moveProgress: number; // 0 to 1

    // AI State
    path?: { x: number, y: number }[]; // Current path queue
    idleTimer?: number; // Time to wait before next move
    state?: CreatureState;
    isPlayer?: boolean; // If true, AI won't auto-move

    // Visual Attributes (Deterministic)
    seed: number;
    loadout: Loadout;
    variantSeed?: string;
    primaryColor?: string;
    secondaryColor?: string;
    bodyType?: number;
    accessoryType?: number;

    // Behavior Attributes (Deterministic)
    temperament: Temperament;
    gender: 'M' | 'F';
    speedMultiplier: number;

    // Animation State (Runtime only)
    animPhase: number;

    // Spawn Effect (Runtime only)
    spawnTime?: number;
    isSpawning?: boolean;
    spawnDuration?: number;
    hasEmittedSpawn?: boolean;

    // Chat State (Runtime only)
    currentChat?: string;
    chatExpires?: number;
}

export function createCreature(name: string, x: number, y: number, variant: number = 0, gender: 'M' | 'F' = 'M'): Creature {
    const seed = stringToHash(name) + variant;
    const rng = new RNG(seed);

    const temperaments: Temperament[] = ['SHY', 'SOCIAL', 'EXPLORER'];

    return {
        id: generateUUID(),
        name,
        x,
        y,
        color: `hsl(${rng.nextFloat() * 360}, 70%, 50%)`,
        moveProgress: 0,

        seed,
        loadout: generateLoadout(seed),
        gender,

        // Generate a random speed multiplier between 0.5 and 1.0
        speedMultiplier: 0.5 + (rng.nextFloat() * 0.5),
        temperament: rng.pick(temperaments),
        animPhase: rng.nextFloat() * Math.PI * 2,

        isSpawning: true,
        spawnTime: Date.now(),
        spawnDuration: 600,
        hasEmittedSpawn: false
    };
}

export function hydrateCreature(dbData: any): Creature {
    const { id, name, x, y, variant_seed, gender } = dbData;

    // Re-generate deterministic attributes
    const nameSeed = stringToHash(name);
    const variantHash = variant_seed ? stringToHash(variant_seed) : 0;
    const finalSeed = nameSeed + variantHash;

    const rng = new RNG(finalSeed);
    const temperaments: Temperament[] = ['SHY', 'SOCIAL', 'EXPLORER'];

    return {
        id,
        name,
        x,
        y,
        color: `hsl(${rng.nextFloat() * 360}, 70%, 50%)`,
        moveProgress: 0,

        seed: finalSeed,
        loadout: generateLoadout(finalSeed),
        variantSeed: variant_seed,
        gender: gender || 'M',

        speedMultiplier: 0.5 + (rng.nextFloat() * 0.5),
        temperament: rng.pick(temperaments),
        animPhase: rng.nextFloat() * Math.PI * 2,

        isSpawning: true,
        spawnTime: Date.now(),
        spawnDuration: 600,
        hasEmittedSpawn: false
    };
}
