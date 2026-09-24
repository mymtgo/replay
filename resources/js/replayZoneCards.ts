import type { ReplayCard, ReplayZone } from './types';

/**
 * A zone's cards, most recent arrival first. MTGO gives an object a fresh,
 * higher id each time it changes zone, so the highest id is the card put
 * there last: the top of a graveyard. The hand zone lists `revealed`
 * instead, since an opponent's reveals vanish from later frames.
 */
export function zoneCardsFor(cards: ReplayCard[], revealed: ReplayCard[], player: number, zone: ReplayZone): ReplayCard[] {
    if (zone === 'Hand') {
        return revealed;
    }

    return cards.filter((card) => card.Zone === zone && card.Owner === player).sort((a, b) => b.Id - a.Id);
}
