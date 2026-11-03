export type WindowPoint = { left: number; top: number };
export type WindowSize = { width: number; height: number };
/**
 * A window's top left as a fraction of the viewer, so it survives resizes,
 * and its size in pixels once it has been resized.
 */
export type StoredPosition = { x: number; y: number; width?: number; height?: number };

export const WINDOW_EDGE_PX = 8;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, Math.max(min, max)));
}

/** Keeps the whole window inside the viewer, favouring the top left when it cannot fit. */
export function clampWindow(point: WindowPoint, window: WindowSize, viewer: WindowSize): WindowPoint {
    return {
        left: clamp(point.left, WINDOW_EDGE_PX, viewer.width - window.width - WINDOW_EDGE_PX),
        top: clamp(point.top, WINDOW_EDGE_PX, viewer.height - window.height - WINDOW_EDGE_PX),
    };
}

/** Keeps a resized window at least `min` and inside the viewer from where it sits. */
export function clampSize(size: WindowSize, point: WindowPoint, min: WindowSize, viewer: WindowSize): WindowSize {
    return {
        width: clamp(size.width, min.width, viewer.width - point.left - WINDOW_EDGE_PX),
        height: clamp(size.height, min.height, viewer.height - point.top - WINDOW_EDGE_PX),
    };
}

export function toStoredPosition(point: WindowPoint, viewer: WindowSize, size?: WindowSize | null): StoredPosition {
    const stored: StoredPosition = { x: point.left / viewer.width, y: point.top / viewer.height };

    return size ? { ...stored, width: size.width, height: size.height } : stored;
}

export function fromStoredPosition(stored: StoredPosition, viewer: WindowSize): WindowPoint {
    return { left: stored.x * viewer.width, top: stored.y * viewer.height };
}

function isFraction(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isLength(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Storage is shared with whatever else ran on the origin, so anything malformed is ignored. */
export function parseStoredPosition(raw: string | null): StoredPosition | null {
    if (!raw) {
        return null;
    }

    try {
        const value: unknown = JSON.parse(raw);

        const stored = value as StoredPosition;

        if (typeof value === 'object' && value !== null && isFraction(stored.x) && isFraction(stored.y)) {
            return isLength(stored.width) && isLength(stored.height)
                ? { x: stored.x, y: stored.y, width: stored.width, height: stored.height }
                : { x: stored.x, y: stored.y };
        }
    } catch {
        return null;
    }

    return null;
}

/**
 * By side rather than player id: ids change from game to game. Phones keep
 * their own positions, since a spot picked on a wide screen means little there.
 */
export function windowStorageKey(side: 'you' | 'opponent', zone: string, compact: boolean): string {
    return `mymtgo-replay:zone-window:${compact ? 'compact:' : ''}${side}:${zone}`;
}
