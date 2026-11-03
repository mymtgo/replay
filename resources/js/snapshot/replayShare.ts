/**
 * The frame a shared link opens on: the one it names, kept inside the game.
 * A missing or malformed frame opens at the start, and one past the end
 * (a link from before the replay was regenerated shorter) at the last frame.
 */
export function startFrame(requested: number | null | undefined, total: number): number {
    if (total < 1 || requested == null || !Number.isInteger(requested) || requested < 0) {
        return 0;
    }

    return Math.min(requested, total - 1);
}
