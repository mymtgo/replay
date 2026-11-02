import { frontRowGroups, isFrontRow, landPiles, type CardGroup, type LandPile } from './replayCards';
import { tuckHeadroom } from './replayLinks';
import type { ReplayCardView } from './types';

/** How much of each card behind the front one of a pile shows, as a share of its width. */
export const PILE_PEEK = 0.36;

/** A tapped card lies sideways, as wide as it is tall: this many untapped card widths. */
const TAPPED_WIDTH = 88 / 63;

/**
 * One tile or pile in a row, with the room it takes. `units` is its width in
 * untapped card widths; `gaps` counts the row gaps inside it (between the
 * parts of a pile), which are fixed pixels rather than card widths. `lift`
 * is the headroom, in card heights, its tucked cards need above the row.
 */
export type RowItem = { key: string; units: number; gaps: number; lift: number } & ({ group: CardGroup; pile?: never } | { pile: LandPile; group?: never });

/** Creatures face the centre line; lands and every other permanent sit behind them. */
export type SideRows = { front: RowItem[]; back: RowItem[] };

const cardUnits = (tapped: boolean): number => (tapped ? TAPPED_WIDTH : 1);

function pileUnits(pile: LandPile): number {
    return pile.parts.reduce((total, part) => {
        const last = part.cards.length - 1;

        return total + part.cards.reduce((sum, card, i) => sum + cardUnits(part.tapped) * (i === last ? 1 : PILE_PEEK), 0);
    }, 0);
}

function pileLift(pile: LandPile, tucked: ReadonlyMap<string, ReplayCardView[]>): number {
    return Math.max(0, ...pile.parts.map((part) => tuckHeadroom(part.cards.reduce((sum, card) => sum + (tucked.get(card.key)?.length ?? 0), 0), part.tapped)));
}

export function sideRows(battlefield: ReplayCardView[], pairs: Map<string, number>, tucked: ReadonlyMap<string, ReplayCardView[]>): SideRows {
    const front = frontRowGroups(battlefield.filter(isFrontRow), pairs, tucked).map((group): RowItem => ({
        key: `${group.card.key}-${group.count}`,
        group,
        units: cardUnits(group.card.tapped),
        gaps: 0,
        lift: tuckHeadroom(tucked.get(group.card.key)?.length ?? 0, group.card.tapped),
    }));

    const back = landPiles(battlefield.filter((card) => !isFrontRow(card)), tucked).map((pile): RowItem => ({
        key: `pile-${pile.key}`,
        pile,
        units: pileUnits(pile),
        gaps: pile.parts.length - 1,
        lift: pileLift(pile, tucked),
    }));

    return { front, back };
}
