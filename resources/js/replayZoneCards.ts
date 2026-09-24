import type { ReplayCard, ReplayZone } from './types';

/**
 * A zone's cards, most recent arrival first. MTGO gives an object a fresh,
 * higher id each time it changes zone, so the highest id is the card put
 * there last: the top of a graveyard. The hand zone lists `revealed`
 * instead, since an opponent's reveals vanish from later frames. The
 * sideboard has no order to show, so it reads by name.
 */
export function zoneCardsFor(cards: ReplayCard[], revealed: ReplayCard[], player: number, zone: ReplayZone): ReplayCard[] {
    if (zone === 'Hand') {
        return revealed;
    }

    const inZone = cards.filter((card) => card.Zone === zone && card.Owner === player);

    if (zone === 'Sideboard') {
        return inZone.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    }

    return inZone.sort((a, b) => b.Id - a.Id);
}
