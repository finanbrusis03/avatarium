/**
 * Simple 2D Perlin Noise implementation
 * Based on standard p5.js / Processing implementation
 */
export class Noise {
    private perm: number[] = [];

    constructor(seed: number = Math.random()) {
        this.perm = new Array(512);
        const p = new Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;

        // Shuffle
        let v = seed * 12345; // Simple seed usage
        for (let i = 255; i > 0; i--) {
            // Pseudo-random index
            v = (v * 1664525 + 1013904223) % 4294967296;
            const r = Math.abs(Math.floor(v)) % (i + 1);
            [p[i], p[r]] = [p[r], p[i]];
        }

        // Duplicate
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
        }
    }

    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private lerp(t: number, a: number, b: number): number {
        return a + t * (b - a);
    }

    private grad(hash: number, x: number, y: number, z: number): number {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    public noise2D(x: number, y: number): number {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        const u = this.fade(x);
        const v = this.fade(y);

        const A = this.perm[X] + Y;
        const AA = this.perm[A];
        const AB = this.perm[A + 1];
        const B = this.perm[X + 1] + Y;
        const BA = this.perm[B];
        const BB = this.perm[B + 1];

        // Result -1..1
        const res = this.lerp(v,
            this.lerp(u, this.grad(this.perm[AA], x, y, 0), this.grad(this.perm[BA], x - 1, y, 0)),
            this.lerp(u, this.grad(this.perm[AB], x, y - 1, 0), this.grad(this.perm[BB], x - 1, y - 1, 0))
        );

        // Normalize to 0..1
        return (res + 1) / 2;
    }
}
