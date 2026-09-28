export type ReplayLayout = 'regular' | 'compact-portrait' | 'compact-landscape';

/** Thresholds shared with the host page's immersive media query. */
export function replayLayoutFor(width: number, height: number): ReplayLayout {
    if (height < 500 && width > height) {
        return 'compact-landscape';
    }

    return width < 640 ? 'compact-portrait' : 'regular';
}

/** Card heights the board settles between, in pixels. Phones keep cards readable and scroll a crowded row instead. */
export const CARD_HEIGHT_BOUNDS: Record<'regular' | 'compact', [min: number, max: number]> = {
    regular: [56, 176],
    compact: [72, 128],
};

/**
 * The one card height every row on the board shares. Growing it by one
 * pixel costs one pixel per card row, so the spare room is split between
 * them. Rounded down, so a settled board does not creep.
 */
export function nextCardHeight(current: number, spare: number, rows: number, [min, max]: [number, number]): number {
    if (rows <= 0) {
        return current;
    }

    return Math.max(min, Math.min(max, Math.floor(current + spare / rows)));
}
