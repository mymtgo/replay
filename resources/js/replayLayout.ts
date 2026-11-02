export type ReplayLayout = 'regular' | 'compact-portrait' | 'compact-landscape';

/** Thresholds shared with the host page's immersive media query. */
export function replayLayoutFor(width: number, height: number): ReplayLayout {
    if (height < 500 && width > height) {
        return 'compact-landscape';
    }

    return width < 640 ? 'compact-portrait' : 'regular';
}

/** Card heights the board settles between, in pixels. Phones keep cards readable and scroll a crowded row instead. The cap keeps a near-empty board from drawing giant cards. */
export const CARD_HEIGHT_BOUNDS: Record<'regular' | 'compact', [min: number, max: number]> = {
    regular: [56, 176],
    compact: [72, 128],
};
