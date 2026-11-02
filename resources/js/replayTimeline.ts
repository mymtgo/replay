import type { ReplayTurn } from './types';

/** The turn a moment falls in. */
export function turnAt(turns: ReplayTurn[], step: number): ReplayTurn | null {
    return turns.find((turn) => step >= turn.from && step < turn.to) ?? null;
}

/** The scrubber gives the pregame this much of its length, however long the players took. */
export const PREGAME_SHARE = 5;

/** A wait longer than this counts as this long when the scrubber is laid out. */
export const MAX_GAP_SECONDS = 5;

/** Where each moment sits in a run, 0 to 100, with every wait capped at `MAX_GAP_SECONDS`. A run whose moments share one time is spaced evenly. */
function spreadByTime(times: number[]): number[] {
    let at = 0;
    const scale = times.map((time, index) => (index === 0 ? 0 : (at += Math.min(MAX_GAP_SECONDS, Math.max(0, time - times[index - 1])))));
    const end = scale.at(-1) ?? 0;

    return end > 0 ? scale.map((time) => (time / end) * 100) : times.map((_, index) => (times.length > 1 ? (index / (times.length - 1)) * 100 : 0));
}

/** The first moment after the pregame; 0 when the game has none or nothing else. */
export function pregameEnd(turns: ReplayTurn[]): number {
    return turns[0]?.number === null ? turns[0].to : 0;
}

/**
 * Where each moment sits on the scrubber, as a percentage of the game's
 * length, with one entry past the last moment to mark the end.
 *
 * The pregame (the moments before `pregameEnd`) takes a fixed `PREGAME_SHARE`
 * split evenly between its moments, because nothing there is long on the
 * board however long the players took. The rest is laid out by game time,
 * except that a wait counts for at most `MAX_GAP_SECONDS`, so one long think
 * does not stretch the track while a quick exchange stays proportionate.
 */
export function timelinePositions(times: number[], pregameEnd = 0): number[] {
    if (pregameEnd <= 0 || pregameEnd >= times.length) {
        return [...spreadByTime(times), 100];
    }

    const pregame = times.slice(0, pregameEnd).map((_, index) => (index / pregameEnd) * PREGAME_SHARE);
    const rest = spreadByTime(times.slice(pregameEnd)).map((position) => PREGAME_SHARE + (position / 100) * (100 - PREGAME_SHARE));

    return [...pregame, ...rest, 100];
}

/** Moments recorded in the same second still show for a while, so a burst of lines can be followed. */
const MIN_STEP_MS = 400;

/** The longest playback holds one moment at 1x, however long the players took. */
export const MAX_STEP_MS = 2000;

/**
 * How long playback holds a moment: the time until the next one, kept between
 * `MIN_STEP_MS` and `MAX_STEP_MS`, scaled by speed. The file's own times are
 * still what the clock shows.
 */
export function stepDuration(times: number[], index: number, speed: number): number {
    const from = times[index];
    const to = times[index + 1];

    if (from === undefined || to === undefined) {
        return MIN_STEP_MS / speed;
    }

    return Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, (to - from) * 1000)) / speed;
}

/** The moment showing at a scrubber position: the last one at or before it. */
export function frameAtPosition(positions: number[], position: number): number {
    const last = positions.length - 2;
    const index = positions.findLastIndex((at, frame) => frame <= last && at <= position);

    return Math.max(0, Math.min(last, index));
}
