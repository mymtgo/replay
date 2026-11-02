import type { GameState, Statement } from '@mtgreplay/mtgr';
import { timeLabel } from './replayGame';
import { nameOf } from './replayWords';
import type { ReplayMoment } from './types';

const exilesObject = (s: Statement, key: string) => s.type === 'move' && s.to.zone === 'exile' && `#${s.object.id.n}` === key;

/**
 * Who sent an object to exile and when, for a card with no `exiled with`
 * link: it sits in the exile window, not under anything (CR 607.2a), and this
 * is its context. Reads the latest move into exile at or before moment `upTo`.
 * A rule cause says nothing a reader needs, so it gives null.
 */
export function exiledBy(moments: ReplayMoment[], states: readonly GameState[], upTo: number, key: string): string | null {
    for (let step = Math.min(upTo, moments.length - 1); step >= 0; step--) {
        const member = moments[step].members.findLast((item) => exilesObject(item.line.statement, key));

        if (!member) {
            continue;
        }

        const cause = member.line.cause;
        const state = states[member.index];
        const when = timeLabel(member.line.time ?? moments[step].time);

        if (!cause || !state) {
            return null;
        }

        switch (cause.by) {
            case 'object':
                return `Exiled by ${nameOf(state, cause.id)} at ${when}`;
            case 'cost':
                return `Exiled to pay for ${nameOf(state, cause.id)} at ${when}`;
            case 'player':
                return `Exiled by ${cause.player} at ${when}`;
            default:
                return null;
        }
    }

    return null;
}
