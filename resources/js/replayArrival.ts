import { getObject, type Cause, type GameState, type Statement } from '@mtgreplay/mtgr';
import { timeLabel } from './replayGame';
import { nameOf } from './replayWords';
import type { ReplayMoment } from './types';

type Move = Extract<Statement, { type: 'move' }>;
type ArrivalZone = 'graveyard' | 'exile';

const movesInto = (s: Statement, key: string, zone: ArrivalZone): s is Move =>
    s.type === 'move' && s.to.zone === zone && `#${s.object.id.n}` === key;

/** The verb for how the card got there, from the move's `as` keyword and the zones. */
function verb(move: Move, cause: Cause | null): string {
    switch (move.as) {
        case 'discard':
            return 'Discarded';
        case 'sacrifice':
            return 'Sacrificed';
        case 'destroy':
            return 'Destroyed';
        case 'mill':
            return 'Milled';
    }

    if (move.to.zone === 'exile') {
        return 'Exiled';
    }

    if (move.from.zone === 'stack' && cause?.by === 'object') {
        return 'Countered';
    }

    return 'Put into the graveyard';
}

/** What a rule cause means for a card arriving here, or null when it says nothing a reader needs. */
function ruleNote(move: Move, rule: string, before: GameState | undefined): string | null {
    switch (rule) {
        case 'sba': {
            const had = before ? getObject(before, move.object.id) : undefined;

            return move.from.zone === 'battlefield' && had?.pt ? 'Died' : null;
        }
        case 'resolve':
            return 'Resolved';
        case 'fizzle':
            return 'Countered on resolution (no legal targets)';
        case 'cleanup':
            return 'Discarded to hand size';
        default:
            return null;
    }
}

/**
 * How and when a card in a graveyard or exile got there: "Discarded by
 * Thoughtseize at 0:45", "Exiled to pay for Murktide Regent at 3:10". Reads
 * the latest move of the card into `zone` at or before moment `upTo`, using
 * its cause and `as` keyword. A card exiled `with` a permanent is shown under
 * it instead (CR 607.2a), so callers skip those.
 */
export function arrivedBy(
    moments: ReplayMoment[],
    states: readonly GameState[],
    upTo: number,
    key: string,
    zone: ArrivalZone,
): string | null {
    for (let step = Math.min(upTo, moments.length - 1); step >= 0; step--) {
        const member = moments[step].members.findLast((item) => movesInto(item.line.statement, key, zone));

        if (!member) {
            continue;
        }

        const move = member.line.statement as Move;
        const cause = member.line.cause;
        const state = states[member.index];
        const when = timeLabel(member.line.time ?? moments[step].time);

        if (!cause || !state) {
            return null;
        }

        switch (cause.by) {
            case 'object':
                return `${verb(move, cause)} by ${nameOf(state, cause.id)} at ${when}`;
            case 'cost':
                return `${verb(move, cause)} to pay for ${nameOf(state, cause.id)} at ${when}`;
            case 'player':
                return `${verb(move, cause)} by ${cause.player} at ${when}`;
            case 'rule': {
                const note = ruleNote(move, cause.rule, states[member.index - 1]);

                return note ? `${note} at ${when}` : null;
            }
            default:
                return null;
        }
    }

    return null;
}
