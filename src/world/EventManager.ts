export interface WorldEvent {
    id: string;
    name: string;
    description: string;
    duration: number; // seconds
    active: boolean;
    startTime: number;
}

export const EVENTS: WorldEvent[] = [
    {
        id: 'LIGHTS_NIGHT',
        name: 'Noite',
        description: 'Os vagalumes estão agitados!',
        duration: 30, // Short for testing
        active: false,
        startTime: 0
    },
    {
        id: 'FESTIVAL',
        name: 'Festival da Praça',
        description: 'Todos para o centro!',
        duration: 45,
        active: false,
        startTime: 0
    },
    {
        id: 'NATURE_BLOOM',
        name: 'Desabrochar',
        description: 'A natureza cresce mais rápido.',
        duration: 30,
        active: false,
        startTime: 0
    }
];

export class EventManager {
    public activeEvent: WorldEvent | null = null;
    private nextEventTimer: number = 0;
    private eventInterval: number = 60; // Every 60s try trigger

    public update(dt: number) {
        // If event active, check duration
        if (this.activeEvent) {
            const elapsed = (Date.now() - this.activeEvent.startTime) / 1000;
            if (elapsed > this.activeEvent.duration) {
                this.endEvent();
            }
            return;
        }

        // Timer for next event
        this.nextEventTimer += dt;
        if (this.nextEventTimer > this.eventInterval) {
            this.triggerRandomEvent();
            this.nextEventTimer = 0;
        }
    }

    public triggerRandomEvent() {
        if (this.activeEvent) return;
        const rand = Math.floor(Math.random() * EVENTS.length);
        const evt = EVENTS[rand];
        this.activeEvent = { ...evt, active: true, startTime: Date.now() };
        console.log(`Event Started: ${evt.name}`);
    }

    public endEvent() {
        if (!this.activeEvent) return;
        console.log(`Event Ended: ${this.activeEvent.name}`);
        this.activeEvent = null;
    }
}
