import { useEffect, useRef } from 'react';

export function useGameLoop(callback: (deltaTime: number) => void) {
    const requestRef = useRef<number>(null);
    const previousTimeRef = useRef<number>(null);
    const callbackRef = useRef(callback);

    // Keep callback ref fresh to avoid re-triggering effect
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const animate = (time: number) => {
            if (previousTimeRef.current !== null && previousTimeRef.current !== undefined) {
                const deltaTime = time - previousTimeRef.current;
                callbackRef.current(deltaTime);
            }
            previousTimeRef.current = time;
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);
}
