import { turnAt } from './replayTimeline';
import type { ReplayCard, ReplayFrame, ReplayTurn } from './types';

export type ReplayReveal = {
    card: ReplayCard;
    /** Frame the card was first seen in the opponent's hand. */
    frame: number;
    /** Turn number of that frame; null before the first turn. */
    turn: number | null;
};

/**
 * Every card the opponent showed from hand across the game, in the order they
 * were first seen. MTGO only exposes an opponent's hand card while it is
 * revealed and hands out a fresh id once the card changes zone, so this is a
 * record of what was seen, not a claim about what is still in hand.
 */
export function collectReveals(frames: ReplayFrame[], turns: ReplayTurn[]): ReplayReveal[] {
    const seen = new Map<number, ReplayReveal>();

    frames.forEach((frame, index) => {
        const players = frame.content.Players ?? [];
        const localId = (players.find((player) => player.IsLocal) ?? players[0])?.Id;

        (frame.content.Cards ?? []).forEach((card) => {
            if (card.Zone !== 'Hand' || card.Owner === localId || seen.has(card.Id)) {
                return;
            }

            seen.set(card.Id, { card, frame: index, turn: turnAt(turns, index)?.number ?? null });
        });
    });

    return [...seen.values()];
}
