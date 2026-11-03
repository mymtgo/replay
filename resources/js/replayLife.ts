import type { GameState, Player } from '@mtgreplay/mtgr';
import { turnAt } from './replayTimeline';
import type { ReplayMoment, ReplayTurn } from './types';
import { causeView } from './replayWords';

/** One `life` line: who, from and to, what caused it, and when. */
export type ReplayLifeChange = {
    /** The moment it happens at. */
    step: number;
    player: Player;
    old: number;
    new: number;
    /** What caused it, worded: a card's name or a rule. */
    cause: string | null;
    /** The turn it happens in, counted as its player counts their own turns; null in the pregame. */
    turn: number | null;
    /** Whose turn it is; null in the pregame. */
    activePlayer: Player | null;
};

/** Every life change of the game, in order. A player's history is the changes up to the current moment. */
export function lifeChanges(moments: ReplayMoment[], states: GameState[], turns: ReplayTurn[]): ReplayLifeChange[] {
    return moments.flatMap((moment, step) =>
        moment.members.flatMap(({ index, line }) => {
            const statement = line.statement;

            if (statement.type !== 'life') {
                return [];
            }

            return [
                {
                    step,
                    player: statement.player,
                    old: statement.old,
                    new: statement.new,
                    cause: causeView(states[index], line.cause)?.text ?? null,
                    turn: turnAt(turns, step)?.playerTurn ?? null,
                    activePlayer: turnAt(turns, step)?.player ?? null,
                },
            ];
        }),
    );
}
