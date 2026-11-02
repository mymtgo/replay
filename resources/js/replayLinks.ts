import type { ReplayCardView } from './types';

/** Cards drawn behind one host; a bigger stack still counts every card but draws no deeper. */
export const TUCK_LAYERS = 3;

/** How much of each tucked card shows past the one in front, as a share of its width. */
export const TUCK_PEEK = 0.32;

/**
 * Cards that sit under a permanent on a real table: what it exiled
 * (`exiledWith`, while the card is in exile) and what is attached to it
 * (`attachedTo`, while both are on the battlefield). Keyed by the host's key.
 * A link to a host that is not on the battlefield, or that is itself tucked
 * under another permanent, is ignored, so the card keeps its normal place.
 * Once the parser's state ends the link the card drops out of the map.
 */
export function tuckedUnder(cards: ReplayCardView[], zones: ReadonlyMap<string, string | null>): Map<string, ReplayCardView[]> {
    const onBattlefield = new Set(cards.filter((card) => zones.get(card.key) === 'battlefield').map((card) => card.key));

    const hostOf = (card: ReplayCardView): string | null => {
        const zone = zones.get(card.key);
        const host = zone === 'exile' ? card.exiledWith : zone === 'battlefield' ? card.attachedTo : null;

        return host !== null && host !== card.key && onBattlefield.has(host) ? host : null;
    };

    const hosts = new Map(cards.map((card) => [card.key, hostOf(card)]));
    const tucked = new Map<string, ReplayCardView[]>();

    cards.forEach((card) => {
        const host = hosts.get(card.key) ?? null;

        if (host === null || hosts.get(host) !== null) {
            return;
        }

        tucked.set(host, [...(tucked.get(host) ?? []), card]);
    });

    return tucked;
}

/** Keys of every card the map tucks, which the battlefield rows leave out. */
export function tuckedKeys(tucked: ReadonlyMap<string, ReplayCardView[]>): Set<string> {
    return new Set([...tucked.values()].flat().map((card) => card.key));
}

/** The extra width a host tile grows by to leave room for the cards peeking out from under it. */
export function tuckExtraWidth(count: number): string {
    return `calc(var(--replay-card-h) * 63 / 88 * ${TUCK_PEEK * Math.min(count, TUCK_LAYERS)})`;
}
