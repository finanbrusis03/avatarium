export class WorldTime {
    public time: number = 0.3; // 0..1 (0.3 = Morning)
    public cycleSpeed: number = 0.0005; // ~33 mins per cycle at 60fps? No.
    // Real time check: 
    // If delta is seconds... let's say 2 min cycle = 120s.
    // 1.0 / 120 = 0.0083 per second.
    // Update receives deltaTime in seconds usually?
    // In GameLoop: deltaTime is ms? No, usually seconds or fractional seconds.
    // Let's assume standard frame delta.

    public update(dt: number) {
        // dt is in seconds usually in my GameLoop (based on previous files)
        // Let's assume 2 minutes cycle -> 120s
        const cycleDuration = 120; // seconds
        this.time += dt / cycleDuration;
        if (this.time >= 1.0) this.time -= 1.0;
    }

    public getLightLevel(): number {
        // 0 = Darkest (Night), 1 = Brightest (Noon)
        // Sin wave mapped 0..1
        // time 0.5 = Noon (1.0)
        // time 0.0/1.0 = Midnight (0.0)

        // sin(0) = 0
        // sin(PI/2) = 1
        // sin(PI) = 0
        // sin(3PI/2) = -1

        // We want 0.5 to be peak.
        // theta = time * 2PI
        // sin(theta - PI/2) -> starts at -1 (midnight), goes to 1 (noon), back to -1.
        // map -1..1 to 0..1 -> (val + 1) / 2

        const theta = this.time * Math.PI * 2;
        const val = Math.sin(theta - Math.PI / 2); // -1..1
        return (val + 1) / 2; // 0..1
    }

    public getPhase(): 'Day' | 'Night' | 'Dawn' | 'Dusk' {
        if (this.time > 0.25 && this.time < 0.75) return 'Day';
        if (this.time >= 0.75 || this.time <= 0.25) return 'Night';
        return 'Day'; // Simplification
    }
}
