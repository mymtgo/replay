import type { ReplayFrame } from './types';

/**
 * Frames with every card placed in the zone it is really in.
 *
 * MTGO's log gives each card a display `Zone` and an `ActualZone`. They
 * differ for exiled cards MTGO draws somewhere else: a card imprinted on
 * Ugin's Labyrinth shows as `Battlefield` next to its host, and one that can
 * be played from exile shows as `LocalExileCanBePlayed` or
 * `OpponentExileCanBePlayed`. The log does not say which host a card sits
 * under, so such a card is placed in exile rather than left looking like a
 * permanent. Other differences (a companion's `Companion` over `Sideboard`)
 * are display choices the viewer already handles, and are left alone.
 *
 * Frames with nothing to move are returned as they came.
 */
export function normaliseFrames(frames: ReplayFrame[]): ReplayFrame[] {
    return frames.map((frame) => {
        const cards = frame.content.Cards ?? [];

        if (!cards.some(isHiddenExile)) {
            return frame;
        }

        return {
            ...frame,
            content: {
                ...frame.content,
                Cards: cards.map((card) => (isHiddenExile(card) ? { ...card, Zone: 'Exile' } : card)),
            },
        };
    });
}

function isHiddenExile(card: { Zone: string; ActualZone?: string }): boolean {
    return card.ActualZone === 'Exile' && card.Zone !== 'Exile';
}
