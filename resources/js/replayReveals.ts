import { idKey, type GameState } from '@mtgreplay/mtgr';
import type { ReplayMoment } from './types';

/** The hand cards being shown right now, by key, and the source that is showing them. */
export type RevealView = { keys: ReadonlySet<string>; by: string | null };

export const NO_REVEAL: RevealView = { keys: new Set(), by: null };

/**
 * What each moment has revealed. A `reveal` line shows an object for as long
 * as the object that caused it is still on the stack, so a Thoughtseize
 * hand stays shown from the reveal until the spell finishes resolving. A
 * reveal by something that is not on the stack (a Chancellor in the opening
 * hand) shows for its own moment only. Only cards still in a hand count.
 * The parser's state keeps a revealed card's name afterwards, which is what
 * leaves it known; this is only about the revealing itself.
 */
export function deriveReveals(moments: ReplayMoment[], states: GameState[]): RevealView[] {
    const live = new Map<string, Set<string>>();

    return moments.map((moment) => {
        moment.members.forEach(({ line }) => {
            if (line.statement.type !== 'reveal' || line.cause?.by !== 'object') {
                return;
            }

            const cause = idKey(line.cause.id);
            const keys = live.get(cause) ?? new Set<string>();

            keys.add(idKey(line.statement.object.id));
            live.set(cause, keys);
        });

        const state = states[moment.index];
        const onStack = new Set(state.stack.map(idKey));
        const keys = new Set<string>();
        let by: string | null = null;

        live.forEach((revealed, cause) => {
            revealed.forEach((key) => {
                if (state.objects[key]?.zone?.zone === 'hand') {
                    keys.add(key);
                    by ??= state.objects[cause]?.name ?? null;
                }
            });

            if (!onStack.has(cause)) {
                live.delete(cause);
            }
        });

        return keys.size ? { keys, by } : NO_REVEAL;
    });
}
