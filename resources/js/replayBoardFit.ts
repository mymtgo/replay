import type { RowItem, SideRows } from './replayRows';

/** An untapped card's width over its height. */
export const CARD_ASPECT = 63 / 88;

/** An empty card row keeps this share of a card's height, so the drop zone reads without taking a row's worth of room. */
export const EMPTY_ROW_WEIGHT = 0.5;

/** The opponent's hand is mostly card backs, so it is drawn this share of the board's card height. */
export const OPPONENT_HAND_SCALE = 0.65;

/** Extra room, in pixels, between the creatures and the rest when they share one row. */
export const GROUP_SPACER = 10;

/**
 * `merge` puts a side's creatures and other permanents in one row while they
 * fit across, and splits them into two rows when they do not. `single` always
 * uses one row and `split` always two.
 */
export type FitMode = 'merge' | 'single' | 'split';

export type FitSide = {
    rows: SideRows;
    /** Height of this side's battlefield, padding included. */
    fieldHeight: number;
    /** Room across one row, padding excluded; Infinity when a crowded row scrolls instead. */
    width: number;
};

export type FitInput = {
    sides: FitSide[];
    /** Each hand row's share of the card height. */
    hands: number[];
    /** Height the hand rows take now, which the battlefields give back when the hands shrink. */
    handsHeight: number;
    /** Height around the cards, in pixels, of a hand row, a battlefield row, and a battlefield's own padding. */
    handPad: number;
    rowPad: number;
    fieldPad: number;
    /** Gap between items of a row. */
    gap: number;
    mode: FitMode;
    bounds: [min: number, max: number];
};

export type BoardFit = {
    /** The one card height the board shares. */
    height: number;
    /** Per side: whether its creatures and other permanents share one row. */
    merged: boolean[];
};

/** A row that holds anything is a card tall, plus the headroom its tallest tucked stack needs; an empty one is only a part of a card. */
export function rowWeight(items: readonly RowItem[]): number {
    return items.length ? 1 + Math.max(...items.map((item) => item.lift)) : EMPTY_ROW_WEIGHT;
}


function rowWidth(items: readonly RowItem[], height: number, gap: number, spacer = 0): number {
    const units = items.reduce((sum, item) => sum + item.units, 0);
    const gaps = items.reduce((sum, item) => sum + item.gaps, Math.max(0, items.length - 1));

    return units * CARD_ASPECT * height + gaps * gap + spacer;
}

type Plan = { merged: boolean; weights: number[]; fits: boolean };

function plan(side: FitSide, height: number, input: FitInput): Plan {
    const { front, back } = side.rows;
    const both = [...front, ...back];
    const mergedFits = rowWidth(both, height, input.gap, front.length && back.length ? GROUP_SPACER : 0) <= side.width;
    const merged = input.mode === 'single' || (input.mode === 'merge' && mergedFits);

    if (merged) {
        return { merged, weights: [rowWeight(both)], fits: mergedFits };
    }

    return {
        merged,
        weights: [rowWeight(front), rowWeight(back)],
        fits: rowWidth(front, height, input.gap) <= side.width && rowWidth(back, height, input.gap) <= side.width,
    };
}

/**
 * The biggest card height the board can share. Each battlefield and the hands
 * split the viewer's height between them, so a height is only allowed when
 * every battlefield's rows, plus its share of the hand rows, fit in the room
 * it has, and every row fits across. When nothing does, the smallest height
 * is used and a crowded row overlaps its cards. A side whose
 * creatures and other permanents fit across in one row uses one, which is
 * what lets a quiet board draw big cards; once they no longer fit, the split
 * rows are tried at the same height before shrinking further.
 */
export function fitBoard(input: FitInput): BoardFit {
    const [min, max] = input.bounds;
    const count = input.sides.length;

    if (!count) {
        return { height: min, merged: [] };
    }

    const handsAt = (height: number) => input.hands.reduce((sum, weight) => sum + weight * height + input.handPad, 0);
    const room = input.sides.map((side) => side.fieldHeight + input.handsHeight / count);

    const attempt = (height: number): { plans: Plan[]; tall: boolean } => {
        const plans = input.sides.map((side) => plan(side, height, input));
        const tall = plans.every((p, i) => p.weights.reduce((sum, weight) => sum + weight * height + input.rowPad, input.fieldPad) + handsAt(height) / count <= room[i] + 0.5);

        return { plans, tall };
    };

    for (let height = Math.floor(max); height >= min; height--) {
        const { plans, tall } = attempt(height);

        if (tall && plans.every((p) => p.fits)) {
            return { height, merged: plans.map((p) => p.merged) };
        }
    }

    return { height: min, merged: attempt(min).plans.map((p) => p.merged) };
}
