import type { ReplayFrame, ReplayLogEntry, ReplayLogItem, ReplayTurn } from './types';

const TURN_LINE = /^Turn \d+:?\s*$/;

/** Two turn-start candidates this close together are the same turn seen by two sources. */
const SAME_TURN_WINDOW_MS = 2000;

/**
 * Milliseconds since midnight for an `H:i:s` or `H:i:s.v` timestamp. Frames
 * from a synced match carry ISO timestamps instead, so a date prefix and a
 * zone suffix are dropped first; only gaps between frames matter here.
 */
export function timestampMs(timestamp: string): number {
    const time = timestamp.includes('T') ? timestamp.slice(timestamp.indexOf('T') + 1).replace(/(Z|[+-]\d{2}:?\d{2})$/, '') : timestamp;
    const [clock, fraction] = time.split('.');
    const [h, m, s] = clock.split(':').map(Number);

    return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000 + Number((fraction ?? '0').padEnd(3, '0').slice(0, 3));
}

/**
 * Frame index a log line belongs to: the first frame in or after the line's second.
 * Log lines only carry whole seconds, frames may carry milliseconds.
 */
export function frameForTimestamp(frames: ReplayFrame[], timestamp: string): number {
    const second = timestamp.slice(0, 8);
    const index = frames.findIndex((frame) => frame.timestamp.slice(0, 8) >= second);

    return index === -1 ? frames.length - 1 : index;
}

/**
 * Turn boundaries for the scrubber and the log.
 *
 * MTGO numbers turns per round and the sidecar only reports a turn when that
 * round number changes, so neither source alone sees every turn. The log's
 * "Turn N:" lines and the frames' Turn changes are merged, and the active
 * player alternates from the seat that played first.
 */
export function deriveTurns(frames: ReplayFrame[], log: ReplayLogEntry[]): ReplayTurn[] {
    if (!frames.length) {
        return [];
    }

    const candidates = new Set<number>();

    log.filter((entry) => TURN_LINE.test(entry.message)).forEach((entry) => candidates.add(frameForTimestamp(frames, entry.timestamp)));

    frames.forEach((frame, index) => {
        const previous = frames[index - 1]?.content.Turn;

        if (index > 0 && previous != null && frame.content.Turn != null && frame.content.Turn !== previous) {
            candidates.add(index);
        }
    });

    const starts: number[] = [];

    [...candidates]
        .sort((a, b) => a - b)
        .forEach((index) => {
            const last = starts[starts.length - 1];

            if (last === undefined || timestampMs(frames[index].timestamp) - timestampMs(frames[last].timestamp) > SAME_TURN_WINDOW_MS) {
                starts.push(index);
            }
        });

    const seats = frames[0].content.Players.map((player) => player.Id);
    const firstSeat = startingSeat(frames, log, starts[0]);

    const turns: ReplayTurn[] = starts.map((from, i) => ({
        number: i + 1,
        from,
        to: starts[i + 1] ?? frames.length,
        player: firstSeat === null || seats.length !== 2 ? null : seats[(seats.indexOf(firstSeat) + i) % 2],
    }));

    if (!turns.length || turns[0].from > 0) {
        turns.unshift({ number: null, from: 0, to: turns[0]?.from ?? frames.length, player: null });
    }

    return turns;
}

function startingSeat(frames: ReplayFrame[], log: ReplayLogEntry[], firstTurnFrame: number | undefined): number | null {
    const players = frames[0].content.Players;

    for (const entry of log) {
        const match = entry.message.match(/^(.+?) chooses to (play|draw) first/);

        if (!match) {
            continue;
        }

        const chooser = players.find((player) => player.Name === match[1]);
        const other = players.find((player) => player.Name !== match[1]);

        if (chooser && other) {
            return match[2] === 'play' ? chooser.Id : other.Id;
        }
    }

    const seeded = firstTurnFrame === undefined ? undefined : frames[firstTurnFrame]?.content.ActivePlayer;

    return seeded ?? null;
}

/** Log rows for the drawer: a header per turn, then each line pinned to its frame. */
export function buildLogItems(frames: ReplayFrame[], log: ReplayLogEntry[], turns: ReplayTurn[]): ReplayLogItem[] {
    const headers = turns
        .filter((turn) => turn.number !== null)
        .map((turn) => ({
            kind: 'header' as const,
            timestamp: frames[turn.from].timestamp.slice(0, 8),
            text: `Turn ${turn.number}`,
            frame: turn.from,
            player: turn.player,
        }));

    const lines = log
        .filter((entry) => !TURN_LINE.test(entry.message))
        .map((entry) => ({
            kind: 'line' as const,
            timestamp: entry.timestamp,
            text: entry.message,
            frame: frameForTimestamp(frames, entry.timestamp),
            player: null,
        }));

    return [...headers, ...lines]
        .map((item, order) => ({ item, order }))
        .sort((a, b) => a.item.frame - b.item.frame || (a.item.kind === b.item.kind ? a.order - b.order : a.item.kind === 'header' ? -1 : 1))
        .map(({ item }, key) => ({ ...item, key }));
}

/** The turn a frame falls in. */
export function turnAt(turns: ReplayTurn[], frame: number): ReplayTurn | null {
    return turns.find((turn) => frame >= turn.from && frame < turn.to) ?? null;
}

/** Whether any turn could be numbered; games recorded from the MTGO log alone carry none. */
export function hasNumberedTurns(turns: ReplayTurn[]): boolean {
    return turns.some((turn) => turn.number !== null);
}

/** Zones where a card arriving is something happening, not hand or library churn. */
const NOTABLE_ZONES = new Set(['Stack', 'Battlefield']);

/**
 * Frames where something visible happened: a card reached the stack or the
 * battlefield, a permanent left the battlefield, or a life total moved.
 * Without turn data these are what the scrubber marks and what the skip
 * buttons jump between, so skipping lands on plays rather than on draws.
 */
export function notableFrames(frames: ReplayFrame[]): number[] {
    const notable: number[] = [];

    frames.forEach((frame, index) => {
        const previous = frames[index - 1];

        if (!previous) {
            return;
        }

        const before = new Map(previous.content.Cards.map((card) => [card.Id, card.Zone]));
        const onBattlefield = new Set(frame.content.Cards.filter((card) => card.Zone === 'Battlefield').map((card) => card.Id));
        const lives = new Map(previous.content.Players.map((player) => [player.Id, player.Life]));

        const arrived = frame.content.Cards.some((card) => NOTABLE_ZONES.has(card.Zone) && before.get(card.Id) !== card.Zone);
        const left = [...before].some(([id, zone]) => zone === 'Battlefield' && !onBattlefield.has(id));
        const lifeMoved = frame.content.Players.some((player) => lives.has(player.Id) && lives.get(player.Id) !== player.Life);

        if (arrived || left || lifeMoved) {
            notable.push(index);
        }
    });

    return notable;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** One stretch of thinking: the clock ran from `from` down to `to` between `start` and `end`. */
export interface ReplayClockBooking {
    start: number;
    end: number;
    from: number;
    to: number;
}

export interface ReplayClockTimeline {
    /** Milliseconds since the first frame, for every frame. */
    times: number[];
    players: Map<number, { initial: number; bookings: ReplayClockBooking[] }>;
}

/** Milliseconds since the first frame, for every frame. Timestamps carry no date, so a game past midnight wraps. */
export function frameTimes(frames: ReplayFrame[]): number[] {
    const times: number[] = [];

    frames.forEach((frame, index) => {
        if (index === 0) {
            times.push(0);

            return;
        }

        let gap = timestampMs(frame.timestamp) - timestampMs(frames[index - 1].timestamp);

        if (gap < 0) {
            gap += DAY_MS;
        }

        times.push(times[index - 1] + gap);
    });

    return times;
}

/**
 * Rebuilds when each chess clock actually ran. MTGO only books a player's
 * TimeLeft once their clock stops, so a frame's value lags: it sits still
 * while they think, then drops by the whole think at once. Each drop is
 * spread back over the time before the frame it lands on, so the clock runs
 * down while the player is thinking rather than jumping afterwards.
 */
export function clockTimeline(frames: ReplayFrame[]): ReplayClockTimeline {
    const times = frameTimes(frames);
    const players: ReplayClockTimeline['players'] = new Map();

    frames.forEach((frame, index) => {
        frame.content.Players.forEach((player) => {
            if (player.TimeLeft == null) {
                return;
            }

            const clock = players.get(player.Id);

            if (!clock) {
                players.set(player.Id, { initial: player.TimeLeft, bookings: [] });

                return;
            }

            const last = clock.bookings.at(-1);
            const from = last?.to ?? clock.initial;

            if (player.TimeLeft === from) {
                return;
            }

            const end = times[index];
            const spent = from - player.TimeLeft;

            // A clock cannot run twice at once, nor before the game; a rise (time added) lands instantly.
            const start = spent > 0 ? Math.min(end, Math.max(end - spent, last?.end ?? 0)) : end;

            clock.bookings.push({ start, end, from, to: player.TimeLeft });
        });
    });

    return { times, players };
}

/** A player's clock at `time` milliseconds into the game. */
export function clockAt(clock: { initial: number; bookings: ReplayClockBooking[] }, time: number): number {
    let value = clock.initial;

    for (const booking of clock.bookings) {
        if (time >= booking.end) {
            value = booking.to;

            continue;
        }

        if (time > booking.start) {
            return booking.from - ((booking.from - booking.to) * (time - booking.start)) / (booking.end - booking.start);
        }

        break;
    }

    return value;
}

/** Milliseconds into the game `progress` (0 to 1) of the way from a frame to the next. */
export function playheadTime(times: number[], index: number, progress: number): number {
    const from = times[index] ?? 0;

    return from + ((times[index + 1] ?? from) - from) * progress;
}

/**
 * Every clock shown at `time` milliseconds into the game, on the frame at
 * `index`, to the whole second the HUD displays so an unchanged read can be
 * skipped. Rounded up, like a countdown, so clocks tick on the same second
 * as the game time. Players the frame records no clock for are left out.
 */
export function clocksAt(frames: ReplayFrame[], timeline: ReplayClockTimeline, index: number, time: number): Map<number, number> {
    const clocks = new Map<number, number>();

    (frames[index]?.content.Players ?? []).forEach((player) => {
        const clock = timeline.players.get(player.Id);

        if (player.TimeLeft == null || !clock) {
            return;
        }

        clocks.set(player.Id, Math.ceil(clockAt(clock, time) / 1000) * 1000);
    });

    return clocks;
}

/** Time of day `elapsed` milliseconds after the first frame, as `H:i:s`; empty without timestamps. */
export function timeOfDay(frames: ReplayFrame[], elapsed: number): string {
    const first = frames[0]?.timestamp;

    if (!first) {
        return '';
    }

    const seconds = Math.floor(((timestampMs(first) + elapsed) % DAY_MS) / 1000);

    return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((part) => String(part).padStart(2, '0')).join(':');
}

/**
 * Where each frame sits on the scrubber, as a percentage of the game's
 * length, so a long think takes up the room it took in the game. One entry
 * past the last frame marks the end. Frames without usable timestamps are
 * spaced evenly instead.
 */
export function timelinePositions(frames: ReplayFrame[]): number[] {
    const times = frameTimes(frames);
    const length = times.at(-1) ?? 0;
    const scale = length > 0 ? times : times.map((_, index) => index);
    const end = scale.at(-1) ?? 0;

    return [...scale.map((time) => (end > 0 ? (time / end) * 100 : 0)), 100];
}

/** The frame showing at a scrubber position: the last one at or before it. */
export function frameAtPosition(positions: number[], position: number): number {
    const last = positions.length - 2;
    const index = positions.findLastIndex((at, frame) => frame <= last && at <= position);

    return Math.max(0, Math.min(last, index));
}
