export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export interface Point {
    x: number;
    y: number;
}

/**
 * Converts isometric grid coordinates to screen coordinates.
 * @param isoX Grid X
 * @param isoY Grid Y
 */
export function isoToScreen(isoX: number, isoY: number): Point {
    return {
        x: (isoX - isoY) * (TILE_WIDTH / 2),
        y: (isoX + isoY) * (TILE_HEIGHT / 2),
    };
}

/**
 * Converts screen coordinates to isometric grid coordinates.
 * @param screenX Screen X (relative to world origin)
 * @param screenY Screen Y (relative to world origin)
 */
export function screenToIso(screenX: number, screenY: number): Point {
    const halfWidth = TILE_WIDTH / 2;
    const halfHeight = TILE_HEIGHT / 2;

    // screenX = (isoX - isoY) * halfWidth
    // screenY = (isoX + isoY) * halfHeight
    //
    // screenX / halfWidth = isoX - isoY
    // screenY / halfHeight = isoX + isoY
    //
    // Sum: (screenX / HW) + (screenY / HH) = 2 * isoX
    // Sub: (screenY / HH) - (screenX / HW) = 2 * isoY

    return {
        x: ((screenX / halfWidth) + (screenY / halfHeight)) / 2,
        y: ((screenY / halfHeight) - (screenX / halfWidth)) / 2,
    };
}
