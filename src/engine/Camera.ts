export interface Camera {
    x: number;
    y: number;
    zoom: number;

    // Target values for smooth interpolation
    targetX: number;
    targetY: number;
    targetZoom: number;

    // Follow functionality
    followTargetId: string | null;
}

export const INITIAL_CAMERA: Camera = {
    x: 0,
    y: 0,
    zoom: 1,
    targetX: 0,
    targetY: 0,
    targetZoom: 1,
    followTargetId: null,
};
