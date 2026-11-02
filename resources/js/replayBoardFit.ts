import type { RowItem, SideRows } from './replayRows';

/** An untapped card's width over its height. */
export const CARD_ASPECT = 63 / 88;

/** A phone's empty card row keeps only half a card's height, so it does not take a row's worth of room. The wide viewer keeps empty rows a full card tall, so a creature arriving never pushes the lands. */
export const emptyRowWeight = (compact: boolean): number => (compact ? 0.5 : 1);

/** The docked hand is drawn this share of the board's card height: hover shows the card in full, so it can be a little smaller. */
export const HAND_SCALE = 0.7;

/** Extra room, in pixels, between the creatures and the rest when they share one row. */
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
    /** The docked hand's share of the card height; empty where the viewer has none. */
    hands: number[];
    /** Height the docked hand takes now, which the battlefields give back when it shrinks. */
    handsHeight: number;
    /** Height around the cards, in pixels, of the hand, a battlefield row, and a battlefield's own padding. */
    handPad: number;
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
function rowWidth(items: readonly RowItem[], height: number, gap: number, spacer = 0): number {
    const units = items.reduce((sum, item) => sum + item.units, 0);
    const gaps = items.reduce((sum, item) => sum + item.gaps, Math.max(0, items.length - 1));

    return units * CARD_ASPECT * height + gaps * gap + spacer;
}

type Plan = { weights: number[]; fits: boolean };

function plan(side: FitSide, height: number, input: FitInput): Plan {
    const { front, back } = side.rows;

    if (input.mode === 'single') {
        const both = [...front, ...back];

        return { weights: [rowWeight(both, input.emptyWeight)], fits: rowWidth(both, height, input.gap, front.length && back.length ? GROUP_SPACER : 0) <= side.width };
    }

    return {
        weights: [rowWeight(front, input.emptyWeight), rowWeight(back, input.emptyWeight)],
        fits: rowWidth(front, height, input.gap) <= side.width && rowWidth(back, height, input.gap) <= side.width,
    };
}

/**
 * The biggest card height the board can share. Each battlefield and the hand
 * split the viewer's height between them, so a height is only allowed when
 * every battlefield's two rows, plus its share of the docked hand, fit in the
 * room it has, and each row fits across the player's whole area. When
 * nothing does, the smallest height is used and a crowded row overlaps its
 * cards.
 */
export function fitBoard(input: FitInput): BoardFit {
    const [min, max] = input.bounds;
    const count = input.sides.length;

    if (!count) {
        return { height: min };
    }

    const handsAt = (height: number) => input.hands.reduce((sum, weight) => sum + weight * height + input.handPad, 0);
    const room = input.sides.map((side) => side.fieldHeight + input.handsHeight / count);

    for (let height = Math.floor(max); height >= min; height--) {
        const plans = input.sides.map((side) => plan(side, height, input));
        const tall = plans.every((p, i) => p.weights.reduce((sum, weight) => sum + weight * height + input.rowPad, input.fieldPad) + handsAt(height) / count <= room[i] + 0.5);

        if (tall && plans.every((p) => p.fits)) {
            return { height };
        }
    }

    return { height: min };
}
