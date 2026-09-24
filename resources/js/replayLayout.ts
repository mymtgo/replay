export type ReplayLayout = 'regular' | 'compact-portrait' | 'compact-landscape';

/** Thresholds shared with the host page's immersive media query. */
export function replayLayoutFor(width: number, height: number): ReplayLayout {
    if (height < 500 && width > height) {
        return 'compact-landscape';
    }

    return width < 640 ? 'compact-portrait' : 'regular';
}
