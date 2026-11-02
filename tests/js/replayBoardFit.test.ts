import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { CARD_ASPECT, fitBoard, OPPONENT_HAND_SCALE, type FitInput, type FitSide } from '../../resources/js/replayBoardFit.ts';
import { buildTimeline } from '../../resources/js/replayGame.ts';
import { CARD_HEIGHT_BOUNDS } from '../../resources/js/replayLayout.ts';
import { sideRows, type RowItem, type SideRows } from '../../resources/js/replayRows.ts';
import { cardViews, liveObjects, objectZone } from '../../resources/js/replayState.ts';

const item = (key: string, units = 1, gaps = 0): RowItem => ({ key, units, gaps, lift: 0, group: { card: null as never, count: 1, members: [key] } });
const rows = (front: number, back: number): SideRows => ({
    front: Array.from({ length: front }, (_, i) => item(`f${i}`)),
    back: Array.from({ length: back }, (_, i) => item(`b${i}`)),
});

/** The 2000x893 regular viewer: 732px shared by two battlefields and two hands, 1488px wide. */
function board(sides: SideRows[], over: Partial<FitInput> = {}, width = 1472): FitInput {
    return {
        sides: sides.map((r): FitSide => ({ rows: r, fieldHeight: 239, width })),
        hands: [OPPONENT_HAND_SCALE, 1],
        handsHeight: 0.65 * 101 + 26 + 101 + 26,
        handPad: 26,
        rowPad: 14,
        fieldPad: 8,
        gap: 6,
        mode: 'merge',
        bounds: CARD_HEIGHT_BOUNDS.regular,
        ...over,
    };
}

/** Whether the rows the fit chose stack inside the room each side has. */
function stackHeight(input: FitInput, fit: ReturnType<typeof fitBoard>, side: number): number {
    const { front, back } = input.sides[side].rows;
    const weights = fit.merged[side] ? [1] : [front.length ? 1 : 0.5, back.length ? 1 : 0.5];
    const hands = input.hands.reduce((sum, w) => sum + w * fit.height + input.handPad, 0) / input.sides.length;

    return weights.reduce((sum, w) => sum + w * fit.height + input.rowPad, input.fieldPad) + hands;
}

test('a quiet board shares one row per side and fills the room, which at 2000x893 is far past the old 101px', () => {
    const input = board([rows(0, 2), rows(3, 2)]);
    const fit = fitBoard(input);

    assert.deepEqual(fit.merged, [true, true]);
    assert.ok(fit.height >= 160 && fit.height <= CARD_HEIGHT_BOUNDS.regular[1]);
    assert.ok(stackHeight(input, fit, 1) <= 239 + input.handsHeight / 2 + 0.5);
    assert.ok(stackHeight(input, { ...fit, height: fit.height + 1 }, 1) > 239 + input.handsHeight / 2 + 0.5);
});

test('a near-empty board stops at the cap instead of drawing giant cards', () => {
    const fit = fitBoard(board([rows(0, 0), rows(0, 1)], { sides: [rows(0, 0), rows(0, 1)].map((r) => ({ rows: r, fieldHeight: 600, width: 1472 })), handsHeight: 400 }));

    assert.equal(fit.height, CARD_HEIGHT_BOUNDS.regular[1]);
});

test('a board too wide for one row splits into two, at a height the two rows fit', () => {
    const input = board([rows(0, 3), rows(6, 14)]);
    const fit = fitBoard(input);

    assert.deepEqual(fit.merged, [true, false]);
    assert.ok(fit.height < CARD_HEIGHT_BOUNDS.regular[1]);
    assert.ok(stackHeight(input, fit, 1) <= 239 + input.handsHeight / 2 + 1);
    assert.ok(14 * CARD_ASPECT * fit.height + 13 * 6 <= 1472);
});

test('a row that overflows across shrinks the cards until it fits', () => {
    const wide = board([rows(0, 4), rows(0, 30)], { mode: 'split' });
    const fit = fitBoard(wide);

    assert.ok(30 * CARD_ASPECT * fit.height + 29 * 6 <= 1472);
    assert.ok(30 * CARD_ASPECT * (fit.height + 1) + 29 * 6 > 1472 || stackHeight(wide, { ...fit, height: fit.height + 1 }, 1) > 239 + wide.handsHeight / 2);
});

test('a board that cannot fit at all settles on the smallest height', () => {
    const fit = fitBoard(board([rows(0, 200), rows(0, 200)]));

    assert.equal(fit.height, CARD_HEIGHT_BOUNDS.regular[0]);
    assert.deepEqual(fit.merged, [false, false]);
});

test('an empty row takes half a row, so a side with only lands gets bigger cards than one with both', () => {
    const lands = fitBoard(board([rows(0, 3), rows(0, 3)], { mode: 'split' }));
    const both = fitBoard(board([rows(3, 3), rows(3, 3)], { mode: 'split' }));

    assert.ok(lands.height > both.height);
});

test('the scrolling layouts ignore width and keep their own bounds', () => {
    const compact = board([rows(0, 40), rows(0, 40)], { mode: 'split', bounds: CARD_HEIGHT_BOUNDS.compact, hands: [], handsHeight: 0, sides: [rows(0, 40), rows(0, 40)].map((r) => ({ rows: r, fieldHeight: 300, width: Infinity })) });
    const fit = fitBoard(compact);

    assert.equal(fit.height, CARD_HEIGHT_BOUNDS.compact[1]);
});

test('a landscape phone keeps one row a side', () => {
    const fit = fitBoard(board([rows(3, 4), rows(3, 4)], { mode: 'single', bounds: CARD_HEIGHT_BOUNDS.compact, hands: [], handsHeight: 0, rowPad: 20, sides: [rows(3, 4), rows(3, 4)].map((r) => ({ rows: r, fieldHeight: 140, width: Infinity })) }));

    assert.deepEqual(fit.merged, [true, true]);
    assert.equal(fit.height, 112);
});

test('1280x720 and 1440x900 boards fit their room', () => {
    for (const [room, width, hands] of [[(720 - 47 - 56) / 2 - 60, 760, 150], [239, 912, 153]] as const) {
        const input = board([rows(2, 5), rows(4, 6)], { handsHeight: hands }, width);
        input.sides.forEach((side) => (side.fieldHeight = room));
        const fit = fitBoard(input);

        input.sides.forEach((_, i) => assert.ok(fit.height === 56 || stackHeight(input, fit, i) <= room + hands / 2 + 1));
    }
});

test('the live mycospawn board at 1:57 draws bigger than the old equal-rows rule', () => {
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
