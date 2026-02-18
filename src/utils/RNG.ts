/**
 * A seeded pseudo-random number generator.
 * Uses a simple Mulberry32 implementation.
 */
export class RNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    /**
     * Returns a float between 0 and 1.
     */
    nextFloat(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns an integer between min (inclusive) and max (exclusive).
     */
    nextInt(min: number, max: number): number {
        return Math.floor(this.nextFloat() * (max - min)) + min;
    }

    /**
     * Picks a random element from an array.
     */
    pick<T>(array: T[]): T {
        return array[this.nextInt(0, array.length)];
    }
}
