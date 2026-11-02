import type { ReplayTurn } from './types';

/** The turn a moment falls in. */
export function turnAt(turns: ReplayTurn[], step: number): ReplayTurn | null {
    return turns.find((turn) => step >= turn.from && step < turn.to) ?? null;
}

/**
 * Where each moment sits on the scrubber, as a percentage of the game's
 * length, so a long think takes up the room it took in the game. One entry
 * past the last moment marks the end. A game whose lines all share one time
 * is spaced evenly instead.
 */
export function timelinePositions(times: number[]): number[] {
    const start = times[0] ?? 0;
    const length = (times.at(-1) ?? 0) - start;
    const scale = length > 0 ? times.map((time) => time - start) : times.map((_, index) => index);
    const end = scale.at(-1) ?? 0;

    return [...scale.map((time) => (end > 0 ? (time / end) * 100 : 0)), 100];
}

/** The moment showing at a scrubber position: the last one at or before it. */
export function frameAtPosition(positions: number[], position: number): number {
    const last = positions.length - 2;
    const index = positions.findLastIndex((at, frame) => frame <= last && at <= position);

    return Math.max(0, Math.min(last, index));
}
