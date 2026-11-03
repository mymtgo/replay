import type { ReplayCard, ReplayFrame } from './types';

/** Zones where a card of theirs shows up under a fresh id once it leaves hand. */
const PUBLIC_ZONES = new Set(['Stack', 'Battlefield', 'Graveyard', 'Exile']);

function countByCatalog(cards: Iterable<ReplayCard>): Map<number, number> {
    const counts = new Map<number, number>();

    for (const card of cards) {
        counts.set(card.CatalogID, (counts.get(card.CatalogID) ?? 0) + 1);
    }

    return counts;
}

/**
 * The opponent's hand cards we know, frame by frame, oldest reveal first.
 *
 * MTGO shows a revealed hand for a single frame and then hides it again, so
 * a card seen in hand is carried forward until it can be seen leaving: a
 * same-CatalogID object of theirs arriving in a public zone under a new id
 * that no vanished public object of theirs explains. Library moves leave no
 * trace, so the list is also capped at their hand count.
 */
export function knownOpponentHands(frames: ReplayFrame[]): ReplayCard[][] {
    const hands: ReplayCard[][] = [];
    const seen = new Set<number>();
    let known: ReplayCard[] = [];
    let previousPublic = new Map<number, ReplayCard>();

    frames.forEach((frame) => {
        const players = frame.content.Players ?? [];
        const local = players.find((player) => player.IsLocal) ?? players[0];
        const opponent = players.find((player) => player.Id !== local?.Id);
        const cards = frame.content.Cards ?? [];

        if (!opponent) {
            hands.push(known);

            return;
        }

        const theirs = cards.filter((card) => card.Owner === opponent.Id);
        const inHand = new Map(theirs.filter((card) => card.Zone === 'Hand').map((card) => [card.Id, card]));
        const currentPublic = new Map(theirs.filter((card) => PUBLIC_ZONES.has(card.Zone)).map((card) => [card.Id, card]));

        const arrivals = countByCatalog([...currentPublic.values()].filter((card) => !seen.has(card.Id)));
        const vanished = countByCatalog([...previousPublic.values()].filter((card) => !currentPublic.has(card.Id)));

        let next = [...known];

        arrivals.forEach((count, catalog) => {
            for (let leaving = count - (vanished.get(catalog) ?? 0); leaving > 0; leaving--) {
                const index = next.findIndex((card) => card.CatalogID === catalog && !inHand.has(card.Id));

                if (index < 0) {
                    break;
                }

                next.splice(index, 1);
            }
        });

        inHand.forEach((card) => {
            const index = next.findIndex((item) => item.Id === card.Id);

            if (index < 0) {
                next.push(card);
            } else {
                next[index] = card;
            }
        });

        if (opponent.HandCount != null && next.length > opponent.HandCount) {
            next = next.slice(next.length - opponent.HandCount);
        }

        cards.forEach((card) => seen.add(card.Id));
        previousPublic = currentPublic;
        known = next;
        hands.push(known);
    });

    return hands;
}
