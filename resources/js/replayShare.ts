/**
 * The moment a shared link opens on: the one it names, kept inside the game.
 * A missing or malformed step opens at the start, and one past the end (a
 * link from before the file was re-recorded shorter) at the last moment.
 */
export function startStep(requested: number | null | undefined, total: number): number {
    if (total < 1 || requested == null || !Number.isInteger(requested) || requested < 0) {
        return 0;
    }

    return Math.min(requested, total - 1);
}
