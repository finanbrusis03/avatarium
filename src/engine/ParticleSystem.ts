export interface Particle {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number; // 0 to 1
    size: number;
    color: string;
}

export class ParticleSystem {
    private particles: Particle[] = [];

    public emit(x: number, y: number, count: number, color: string = 'rgba(220, 220, 220, 0.6)') {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                id: Math.random().toString(36).substring(7),
                x,
                y,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 1.5 - 0.5,
                life: 0,
                size: 2 + Math.random() * 4,
                color
            });
        }
    }

    public update(dt: number) {
        const speed = 0.002; // Life speed
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life += dt * speed;
        });

        this.particles = this.particles.filter(p => p.life < 1);
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        this.particles.forEach(p => {
            const alpha = (1 - p.life) * 0.6;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 + p.life), 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}

export const globalParticleSystem = new ParticleSystem();
