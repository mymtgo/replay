import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { CARD_ASPECT, emptyRowWeight, fitBoard, HAND_SCALE, type FitInput, type FitSide } from '../../resources/js/replayBoardFit.ts';
import { buildTimeline } from '../../resources/js/replayGame.ts';
import { CARD_HEIGHT_BOUNDS } from '../../resources/js/replayLayout.ts';
import { sideRows, type RowItem, type SideRows } from '../../resources/js/replayRows.ts';
import { cardViews, liveObjects, objectZone } from '../../resources/js/replayState.ts';

const item = (key: string, units = 1, gaps = 0): RowItem => ({ key, units, gaps, lift: 0, group: { card: null as never, count: 1, members: [key] } });
const rows = (front: number, back: number): SideRows => ({
    front: Array.from({ length: front }, (_, i) => item(`f${i}`)),
    back: Array.from({ length: back }, (_, i) => item(`b${i}`)),
});

/** The 2000x893 regular viewer as measured: two 303px battlefields and a 122px docked hand, rows 1472px wide. */
function board(sides: SideRows[], over: Partial<FitInput> = {}, width = 1472): FitInput {
    return {
        sides: sides.map((r): FitSide => ({ rows: r, fieldHeight: 303, width })),
        hands: [HAND_SCALE],
        handsHeight: HAND_SCALE * 131 + 17,
        handPad: 17,
        rowPad: 14,
        fieldPad: 8,
        gap: 6,
        mode: 'split',
        emptyWeight: emptyRowWeight(false),
        bounds: CARD_HEIGHT_BOUNDS.regular,
        ...over,
    };
}

/** Whether the rows the fit chose stack inside the room each side has. */
function stackHeight(input: FitInput, fit: ReturnType<typeof fitBoard>, side: number): number {
    const { front, back } = input.sides[side].rows;
    const weights = [front.length ? 1 : input.emptyWeight, back.length ? 1 : input.emptyWeight];
    const hands = input.hands.reduce((sum, w) => sum + w * fit.height + input.handPad, 0) / input.sides.length;

    return weights.reduce((sum, w) => sum + w * fit.height + input.rowPad, input.fieldPad) + hands;
}

test('the board always has two rows a side, and the cards fill the room both rows leave', () => {
    const input = board([rows(0, 2), rows(3, 2)]);
    const fit = fitBoard(input);
    const room = 303 + input.handsHeight / 2 + 0.5;

    assert.ok(fit.height > 101 && fit.height <= CARD_HEIGHT_BOUNDS.regular[1]);
    assert.ok(stackHeight(input, fit, 1) <= room);
    assert.ok(stackHeight(input, { height: fit.height + 1 }, 1) > room);
});

test('an empty row on the wide viewer keeps its full height, so a quiet side draws no bigger cards than a busy one', () => {
    const lands = fitBoard(board([rows(0, 3), rows(0, 3)]));
    const both = fitBoard(board([rows(3, 3), rows(3, 3)]));

    assert.equal(lands.height, both.height);
});

test('a phone keeps half a row for an empty one, so a side with only lands gets bigger cards', () => {
    const phone = (r: SideRows[]) => board(r, { emptyWeight: emptyRowWeight(true), bounds: CARD_HEIGHT_BOUNDS.compact, sides: r.map((x) => ({ rows: x, fieldHeight: 260, width: Infinity })), hands: [], handsHeight: 0 });

    assert.ok(fitBoard(phone([rows(0, 3), rows(0, 3)])).height > fitBoard(phone([rows(3, 3), rows(3, 3)])).height);
});

test('a row that overflows across shrinks the cards until it fits', () => {
    const wide = board([rows(0, 4), rows(0, 30)]);
    const fit = fitBoard(wide);

    assert.ok(30 * CARD_ASPECT * fit.height + 29 * 6 <= 1472);
    assert.ok(30 * CARD_ASPECT * (fit.height + 1) + 29 * 6 > 1472 || stackHeight(wide, { height: fit.height + 1 }, 1) > 303 + wide.handsHeight / 2);
});

test('the stack column narrows every row, so the same board draws smaller cards beside a stack', () => {
    const sides = [rows(2, 14), rows(6, 14)];
    const without = fitBoard(board(sides, {}, 1472));
    const beside = fitBoard(board(sides, {}, 1472 - 384));

    assert.ok(beside.height < without.height);
    assert.ok(14 * CARD_ASPECT * beside.height + 13 * 6 <= 1472 - 384);
});

test('a board that cannot fit at all settles on the smallest height', () => {
    assert.equal(fitBoard(board([rows(0, 200), rows(0, 200)])).height, CARD_HEIGHT_BOUNDS.regular[0]);
});

test('the scrolling layouts ignore width and keep their own bounds', () => {
    const compact = board([rows(0, 40), rows(0, 40)], { mode: 'split', emptyWeight: emptyRowWeight(true), bounds: CARD_HEIGHT_BOUNDS.compact, hands: [], handsHeight: 0, sides: [rows(0, 40), rows(0, 40)].map((r) => ({ rows: r, fieldHeight: 300, width: Infinity })) });
    const fit = fitBoard(compact);

    assert.equal(fit.height, CARD_HEIGHT_BOUNDS.compact[1]);
});

test('a landscape phone keeps one row a side', () => {
    const fit = fitBoard(board([rows(3, 4), rows(3, 4)], { mode: 'single', emptyWeight: emptyRowWeight(true), bounds: CARD_HEIGHT_BOUNDS.compact, hands: [], handsHeight: 0, rowPad: 20, sides: [rows(3, 4), rows(3, 4)].map((r) => ({ rows: r, fieldHeight: 140, width: Infinity })) }));

    assert.equal(fit.height, 112);
});

test('1280x720 and 1440x900 boards fit their room', () => {
    for (const [room, width, hands] of [[(720 - 47 - 56) / 2 - 60, 760, 150], [303, 912, 153]] as const) {
        const input = board([rows(2, 5), rows(4, 6)], { handsHeight: hands }, width);
        input.sides.forEach((side) => (side.fieldHeight = room));
        const fit = fitBoard(input);

        input.sides.forEach((_, i) => assert.ok(fit.height === 56 || stackHeight(input, fit, i) <= room + hands / 2 + 1));
    }
});

test('the live mycospawn board at 1:57 draws bigger than the old 101px rule', () => {
    const game = parse(readFileSync(new URL('./fixtures/mycospawn-turn-5.mtgr', import.meta.url), 'utf8')).file.games[0];
    const timeline = buildTimeline(game);
    const moment = timeline.moments.findLast((m) => m.time <= 117)!;
    const state = timeline.steps[moment.index].state;
    const cards = [...cardViews(state, timeline.derived[moment.index], () => null).values()];
    const zones = new Map(liveObjects(state).map((o) => [`#${o.id.n}`, objectZone(o)]));
    const control = (player: string) => cards.filter((c) => zones.get(c.key) === 'battlefield' && c.controller === player);
    const players = [...new Set(cards.map((c) => c.controller))].sort();
    const sides = players.map((p) => sideRows(control(p), new Map(), new Map()));
    const fit = fitBoard(board(sides));

    assert.ok(fit.height > 101);
});
