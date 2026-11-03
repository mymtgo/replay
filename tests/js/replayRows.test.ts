import assert from 'node:assert/strict';
import { test } from 'node:test';
import { landPiles } from '../../resources/js/replayCards.ts';
import { TAPPED_TOP, tuckHeadroom, tuckLift } from '../../resources/js/replayLinks.ts';
import { rowWeight } from '../../resources/js/replayBoardFit.ts';
import { PILE_PEEK, sideRows } from '../../resources/js/replayRows.ts';
import type { ReplayCardView } from '../../resources/js/types.ts';

const card = (key: string, over: Partial<ReplayCardView> = {}): ReplayCardView =>
    ({ key, name: 'Plains', face: null, types: null, tapped: false, power: null, counters: {}, damage: 0, attacking: null, ...over }) as ReplayCardView;

test('a pile of six copies draws four and names the two it does not draw', () => {
    const [pile] = landPiles(Array.from({ length: 6 }, (_, i) => card(`#${i}`)));

    assert.equal(pile.parts[0].cards.length, 4);
    assert.deepEqual(pile.parts[0].hidden, ['#4', '#5']);
});

test('a counted swarm tile stands for every card in it', () => {
    const swarm = Array.from({ length: 5 }, (_, i) => card(`#${i}`, { name: 'Goblin', power: 1, toughness: 1 }));
    const { front } = sideRows(swarm, new Map(), new Map());

    assert.equal(front.length, 1);
    assert.deepEqual(front[0].group?.members, ['#0', '#1', '#2', '#3', '#4']);
});

test('rows size a tapped card as wide as it is tall, and a pile as its front card plus slivers; tucked cards add height, not width', () => {
    const lands = [card('#1'), card('#2'), card('#3', { name: 'Island', tapped: true })];
    const { lands: back } = sideRows(lands, new Map(), new Map());

    assert.equal(back[0].units, 1 + PILE_PEEK);
    assert.equal(back[1].units, 88 / 63);

    const host = card('#9', { name: 'Bear', power: 2 });
    const { front } = sideRows([host], new Map(), new Map([['#9', [card('#10'), card('#11')]]]));

    assert.equal(front[0].units, 1);
    assert.ok(Math.abs(front[0].lift - 0.3) < 1e-9);
});

test('tucked cards stack upward by smaller steps and stop drawing at three', () => {
    assert.equal(tuckLift(0), 0);
    assert.ok(tuckLift(1) > tuckLift(2) - tuckLift(1));
    assert.ok(tuckLift(2) - tuckLift(1) > tuckLift(3) - tuckLift(2));
    assert.equal(tuckLift(7), tuckLift(3));
});

test('a tapped host needs less headroom, since it already sits below the top of its row', () => {
    assert.ok(Math.abs(tuckHeadroom(1, true) - (tuckLift(1) - TAPPED_TOP)) < 1e-9);
    assert.equal(tuckHeadroom(0, true), 0);
});

test('a land with tucked cards leaves its pile, and its row gains headroom only then', () => {
    const lands = [card('#1', { name: 'Ugin' }), card('#2', { name: 'Ugin' }), card('#3', { name: 'Ugin' })];
    const plain = sideRows(lands, new Map(), new Map());
    const withTuck = sideRows(lands, new Map(), new Map([['#2', [card('#9')]]]));

    assert.equal(plain.lands.length, 1);
    assert.equal(rowWeight(plain.lands, 1), 1);
    assert.equal(withTuck.lands.length, 2);
    assert.deepEqual(withTuck.lands.find((item) => item.pile?.parts[0].cards[0].key === '#2')?.pile?.parts[0].cards.map((c) => c.key), ['#2']);
    assert.ok(rowWeight(withTuck.lands, 1) > 1);
});

test('card types place each permanent: creatures, planeswalkers and battles in front, lands apart from the other permanents', () => {
    const board = [
        card('#1', { name: 'Ragavan', types: ['creature'], power: 2, toughness: 1 }),
        card('#2', { name: 'Tamiyo', types: ['planeswalker'] }),
        card('#3', { name: 'Treasure', types: ['artifact'] }),
        card('#4', { name: 'Talisman', types: ['artifact'] }),
        card('#5', { name: 'Mountain', types: ['land'] }),
        card('#6', { name: 'Mutavault', types: ['creature', 'land'], power: 2, toughness: 2 }),
        card('#7', { name: 'Urza', types: ['land'] }),
    ];
    const { front, back, lands } = sideRows(board, new Map(), new Map());

    assert.deepEqual(front.map((item) => item.group?.card.name), ['Ragavan', 'Tamiyo', 'Mutavault']);
    assert.deepEqual(back.map((item) => item.pile?.parts[0].cards[0].name), ['Treasure', 'Talisman']);
    assert.deepEqual(lands.map((item) => item.pile?.parts[0].cards[0].name), ['Mountain', 'Urza']);
});

test('without card types, power and toughness alone decides: the rest sits with the lands', () => {
    const { front, back, lands } = sideRows([card('#1', { power: 1, toughness: 1 }), card('#2', { name: 'Treasure' })], new Map(), new Map());

    assert.equal(front.length, 1);
    assert.equal(back.length, 0);
    assert.equal(lands.length, 1);
});
