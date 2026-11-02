import { replay, tagValue, type Game, type Player, type ReplayStep, type StatementLine, type StatementType } from '@mtgreplay/mtgr';
import type { ReplayDerived, ReplayMatchGame, ReplayMoment, ReplayTurn } from './types';

/** The two seats, the perspective, the result and the archetypes a game's tags give. */
export type ReplayGameInfo = {
    players: [Player, Player];
    perspective: Player;
    /** Who won; null for a draw or an unfinished game. */
    winner: Player | null;
    /** Whether the perspective player won; null when the result is open. */
    won: boolean | null;
    archetypes: Record<Player, string | null>;
    number: number;
};

export function gameInfo(game: Game): ReplayGameInfo {
    const players: [Player, Player] = [tagValue(game, 'Player1') ?? 'Player1', tagValue(game, 'Player2') ?? 'Player2'];
    const perspective = tagValue(game, 'Perspective') ?? players[0];
    const winner = game.result === '1-0' ? players[0] : game.result === '0-1' ? players[1] : null;

    return {
        players,
        perspective,
        winner,
        won: winner === null ? null : winner === perspective,
        archetypes: { [players[0]]: tagValue(game, 'Player1Archetype'), [players[1]]: tagValue(game, 'Player2Archetype') },
        number: Number(tagValue(game, 'Game') ?? 1),
    };
}

/** The games of the file as the picker lists them. */
export function matchGames(games: Game[]): ReplayMatchGame[] {
    return games.map((game, id) => ({ id, number: gameInfo(game).number }));
}

/**
 * Lines that restate state rather than change it: keyframes, stack snapshots
 * and decklists. The reducer applies them, the scrubber does not stop on them.
 */
const SNAPSHOT_TYPES = new Set<StatementType>([
    'keyframe',
    'keyframe-player',
    'keyframe-object',
    'keyframe-effect',
    'round-clock',
    'stack',
    'stack-spell',
    'stack-ability',
    'deck',
    'deck-entry',
    'pass',
]);

/** Lines the scrubber stops on but the log leaves out, since they say nothing a reader wants to scan. */
const UNLOGGED_TYPES = new Set<StatementType>(['priority', 'step', 'pregame']);

/**
 * Whether a line moves the board. A card created in a library is invisible
 * until the move that follows it; a mana ability shows through the tap and
 * the mana it adds.
 */
function isMoment(line: StatementLine): boolean {
    const s = line.statement;

    if (SNAPSHOT_TYPES.has(s.type)) {
        return false;
    }

    if ((s.type === 'new-card' || s.type === 'new-hidden') && s.zone.zone === 'library') {
        return false;
    }

    return !(s.type === 'new-ability' && !s.inStack);
}

const sameCause = (a: StatementLine, b: StatementLine) => JSON.stringify(a.cause) === JSON.stringify(b.cause);

/** Which half of a mulligan a pregame line belongs to: taking the hand back and drawing anew, or bottoming cards and keeping. */
function mulliganPart(line: StatementLine): 'redraw' | 'bottom' | 'keep' | null {
    const s = line.statement;
    const rule = line.cause?.by === 'rule' && line.cause.rule === 'mulligan';

    if (s.type === 'mulligan' || (s.type === 'shuffle' && rule)) {
        return 'redraw';
    }

    if (s.type === 'keep') {
        return 'keep';
    }

    if (s.type === 'move' && rule) {
        return s.position === 'bottom' ? 'bottom' : 'redraw';
    }

    return null;
}

/**
 * Whether `next` is part of the same event as `prev` and shows as one moment,
 * so cards do not pop in one at a time.
 *
 * Anywhere: consecutive moves between the same zones with the same action and
 * cause, in the same second (one effect drawing three cards, a mass discard).
 *
 * Before the first turn, where a second's gap is only the players' pace:
 * the rolls and re-rolls are one moment; moves of the same kind and cause
 * join whatever the second, so both opening hands appear together; a
 * mulligan is its line, the hand going back, the shuffle and the new hand;
 * and the cards put on the bottom join the keep that follows them.
 */
function joins(prev: ReplayMoment, next: ReplayMoment, pregame: boolean): boolean {
    const a = prev.members.at(-1)!.line;
    const b = next.line;
    const p = a.statement;
    const n = b.statement;

    if (pregame) {
        if (p.type === 'roll' && n.type === 'roll') {
            return true;
        }

        const first = mulliganPart(a);
        const second = mulliganPart(b);

        if (first && second) {
            if (n.type === 'mulligan') {
                return false;
            }

            if (first === 'redraw') {
                return second === 'redraw';
            }

            return first === 'bottom' && (second === 'bottom' || second === 'keep');
        }
    }

    if (p.type !== 'move' || n.type !== 'move' || !sameCause(a, b)) {
        return false;
    }

    const sameKind = p.from.zone === n.from.zone && p.to.zone === n.to.zone && p.as === n.as && p.position === n.position;

    return sameKind && (pregame || prev.time === next.time);
}

function mergeMoments(moments: ReplayMoment[]): ReplayMoment[] {
    const firstTurn = moments.findIndex((moment) => moment.line.statement.type === 'turn');
    const pregameEnd = firstTurn === -1 ? moments.length : firstTurn;
    const merged: ReplayMoment[] = [];

    moments.forEach((moment, step) => {
        const last = merged.at(-1);

        if (last && joins(last, moment, step < pregameEnd)) {
            last.members.push(...moment.members);
            last.index = moment.index;
            last.logged ||= moment.logged;

            return;
        }

        merged.push({ ...moment, members: [...moment.members] });
    });

    return merged;
}

/**
 * The body lines the scrubber visits, in order, with the time each happened.
 * Lines that are one event show as one moment (see `joins`).
 */
export function gameMoments(game: Game): ReplayMoment[] {
    const moments: ReplayMoment[] = [];
    let time = 0;

    game.body.forEach((line, index) => {
        if (line.kind !== 'statement' || line.variation) {
            return;
        }

        time = line.time ?? time;

        if (isMoment(line)) {
            moments.push({ index, line, members: [{ index, line }], time, logged: !UNLOGGED_TYPES.has(line.statement.type) });
        }
    });

    return mergeMoments(moments);
}

/** Turn boundaries over the moments: the pregame first, then one per `turn` line. */
export function deriveTurns(moments: ReplayMoment[]): ReplayTurn[] {
    const turns: ReplayTurn[] = [];

    moments.forEach((moment, step) => {
        const s = moment.line.statement;

        if (s.type !== 'turn') {
            return;
        }

        if (turns.length) {
            turns[turns.length - 1].to = step;
        }

        turns.push({ number: s.number, from: step, to: moments.length, player: s.player });
    });

    if (!turns.length || turns[0].from > 0) {
        turns.unshift({ number: null, from: 0, to: turns[0]?.from ?? moments.length, player: null });
    }

    return turns;
}

const EMPTY_DERIVED: ReplayDerived = { step: null, priority: null, active: null, attacking: new Map(), blocking: new Map(), damage: new Map(), clocks: {} };

/**
 * What the lines settle to that the parser's state leaves out, one entry per
 * body line: the current step, who holds priority, this combat's attackers
 * and blockers, damage marked this turn, and the latest clocks. Lines that
 * change none of it share the previous entry.
 */
export function deriveLines(game: Game): ReplayDerived[] {
    const derived: ReplayDerived[] = [];
    let current = EMPTY_DERIVED;

    for (const line of game.body) {
        if (line.kind === 'statement' && !line.variation) {
            current = applyDerived(current, line);
        }

        derived.push(current);
    }

    return derived;
}

function applyDerived(d: ReplayDerived, line: StatementLine): ReplayDerived {
    const s = line.statement;
    const key = (id: { n: number; hypothetical: boolean }) => (id.hypothetical ? `#h${id.n}` : `#${id.n}`);

    switch (s.type) {
        case 'turn':
            return { ...d, step: null, priority: null, active: s.player, attacking: new Map(), blocking: new Map(), damage: new Map() };
        case 'resolve':
        case 'fizzle':
        case 'countered':
            // The active player receives priority after a resolution (CR 117.3b); a file may leave that line out when the stack is then empty.
            return { ...d, priority: d.active };
        case 'step':
            if (s.step === 'end-of-combat' || s.step === 'cleanup') {
                return { ...d, step: s.step, attacking: new Map(), blocking: new Map(), damage: s.step === 'cleanup' ? new Map() : d.damage };
            }

            return { ...d, step: s.step };
        case 'priority': {
            const clocks = s.clock ? Object.fromEntries(s.clock.map((entry) => [entry.player, entry.time])) : d.clocks;

            return { ...d, priority: s.player, clocks };
        }
        case 'keyframe-player':
            return s.clock === null ? d : { ...d, clocks: { ...d.clocks, [s.player]: s.clock } };
        case 'attack':
            return { ...d, attacking: new Map(d.attacking).set(key(s.object.id), s.target) };
        case 'block':
            return { ...d, blocking: new Map(d.blocking).set(key(s.object.id), key(s.attacker.id)) };
        case 'damage': {
            if (s.prevented || s.to.kind !== 'object') {
                return d;
            }

            const target = key(s.to.object.id);

            return { ...d, damage: new Map(d.damage).set(target, (d.damage.get(target) ?? 0) + s.amount) };
        }
        case 'move':
        case 'play':
        case 'cast': {
            // Leaving the battlefield ends the creature's part in combat and clears its damage.
            const k = key(s.object.id);

            if (!d.attacking.has(k) && !d.blocking.has(k) && !d.damage.has(k)) {
                return d;
            }

            const attacking = new Map(d.attacking);
            const blocking = new Map(d.blocking);
            const damage = new Map(d.damage);
            attacking.delete(k);
            blocking.delete(k);
            damage.delete(k);

            return { ...d, attacking, blocking, damage };
        }
        default:
            return d;
    }
}

/** Everything a game yields once: its replay steps, moments, turns and derived line facts. */
export type ReplayTimeline = {
    steps: ReplayStep[];
    moments: ReplayMoment[];
    turns: ReplayTurn[];
    derived: ReplayDerived[];
    /** Each moment's time in seconds. */
    times: number[];
};

export function buildTimeline(game: Game): ReplayTimeline {
    const moments = gameMoments(game);

    return { steps: replay(game), moments, turns: deriveTurns(moments), derived: deriveLines(game), times: moments.map((moment) => moment.time) };
}

/** Seconds into the game as the file writes them: `m:ss`, or `h:mm:ss` past an hour. */
export function timeLabel(seconds: number): string {
    const whole = Math.max(0, Math.floor(seconds));
    const h = Math.floor(whole / 3600);
    const m = Math.floor(whole / 60) % 60;
    const s = whole % 60;

    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
