import { joinGroups, type RowItem, type SideRows } from './replayRows';

/** An untapped card's width over its height. */
export const CARD_ASPECT = 63 / 88;

/** A phone's empty card row keeps only half a card's height, so it does not take a row's worth of room. The wide viewer keeps empty rows a full card tall, so a creature arriving never pushes the lands. */
export const emptyRowWeight = (compact: boolean): number => (compact ? 0.5 : 1);

/** Extra room, in pixels, between groups that share one row: the creatures and the rest, the other permanents and the lands. */
export const GROUP_SPACER = 10;

/**
 * `split` is the board's fixed layout: permanents with power and toughness
 * in the front row, everything else in the back row. `single` puts both in
 * one row, which is what a landscape phone has the height for.
 */
export type FitMode = 'split' | 'single';

export type FitSide = {
    rows: SideRows;
    /** Height of this side's battlefield, padding included. */
    fieldHeight: number;
    /** Room across one row, padding excluded; Infinity when a crowded row scrolls instead. */
    width: number;
};

export type FitInput = {
    sides: FitSide[];
    /** Height around the cards, in pixels, of a battlefield row and of a battlefield's own padding. */
    rowPad: number;
    fieldPad: number;
    /** Gap between items of a row. */
    gap: number;
    mode: FitMode;
    /** What an empty row weighs; see `emptyRowWeight`. */
    emptyWeight: number;
    bounds: [min: number, max: number];
};

export type BoardFit = {
    /** The one card height the board shares. */
    height: number;
};

/** A row that holds anything is a card tall, plus the headroom its tallest tucked stack needs; an empty one is only a part of a card. */
export function rowWeight(items: readonly RowItem[], emptyWeight: number): number {
    return items.length ? 1 + Math.max(...items.map((item) => item.lift)) : emptyWeight;
}
function rowWidth(groups: RowItem[][], height: number, gap: number): number {
    const { items, spacers } = joinGroups(groups);
    const spacer = spacers.length * GROUP_SPACER;
    const units = items.reduce((sum, item) => sum + item.units, 0);
    const gaps = items.reduce((sum, item) => sum + item.gaps, Math.max(0, items.length - 1));

    return units * CARD_ASPECT * height + gaps * gap + spacer;
}

type Plan = { weights: number[]; fits: boolean };

function plan(side: FitSide, height: number, input: FitInput): Plan {
    const { front, back, lands } = side.rows;

    if (input.mode === 'single') {
        return { weights: [rowWeight([...front, ...back, ...lands], input.emptyWeight)], fits: rowWidth([front, back, lands], height, input.gap) <= side.width };
    }

    return {
        weights: [rowWeight(front, input.emptyWeight), rowWeight([...back, ...lands], input.emptyWeight)],
        fits: rowWidth([front], height, input.gap) <= side.width && rowWidth([back, lands], height, input.gap) <= side.width,
    };
}

/**
 * The biggest card height the board can share. A height is only allowed when
 * every battlefield's two rows fit in the room it has, and each row fits
 * across the player's whole area. Windows and the stack float over the board,
 * so they take no room. When nothing fits, the smallest height is used and a
 * crowded row overlaps its cards.
 */
export function fitBoard(input: FitInput): BoardFit {
    const [min, max] = input.bounds;
    const count = input.sides.length;

    if (!count) {
        return { height: min };
    }

    for (let height = Math.floor(max); height >= min; height--) {
        const plans = input.sides.map((side) => plan(side, height, input));
        const tall = plans.every((p, i) => p.weights.reduce((sum, weight) => sum + weight * height + input.rowPad, input.fieldPad) <= input.sides[i].fieldHeight + 0.5);

        if (tall && plans.every((p) => p.fits)) {
            return { height };
        }
    }

    return { height: min };
}
