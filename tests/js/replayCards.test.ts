import assert from 'node:assert/strict';
import { test } from 'node:test';
import { counterDice, counterLabel, frontRowGroups, isFrontRow, previewFaces, ptCounterLabel } from '../../resources/js/replayCards.ts';

const card = (type: string, extra: Record<string, unknown> = {}) => ({ Id: 1, CatalogID: 1, Zone: 'Battlefield', Owner: 1, type, ...extra });

test('a land creature sits with the creatures', () => {
    assert.equal(isFrontRow(card('Land Creature — Forest Dryad', { Power: 1, Toughness: 1 })), true);
});

test('a plain land stays on the back row', () => {
    assert.equal(isFrontRow(card('Basic Land — Forest')), false);
});

test('a creature still sits on the front row', () => {
    assert.equal(isFrontRow(card('Creature — Human Warlock', { Power: 2, Toughness: 2 })), true);
});

test('P/T counters net into one modifier whatever MTGO calls them', () => {
    assert.equal(ptCounterLabel(card('Creature', { Counters: { PlusOnePlusOne: 34 } })), '+34/+34');
    assert.equal(ptCounterLabel(card('Creature', { Counters: { PlusOnePlusOne: 1, MinusOneMinusOne: 3 } })), '-2/-2');
    assert.equal(ptCounterLabel(card('Creature', { Counters: { PlusOnePlusZero: 2 } })), '+2/+0');
    assert.equal(ptCounterLabel(card('Creature', { Counters: { '+1/+1': 2 } })), '+2/+2');
});

test('P/T counters that cancel out show nothing', () => {
    assert.equal(ptCounterLabel(card('Creature', { Counters: { PlusOnePlusOne: 1, MinusOneMinusOne: 1 } })), null);
    assert.equal(ptCounterLabel(card('Creature', { Counters: { Time: 3 } })), null);
});

test('other counters become dice, one per six', () => {
    assert.deepEqual(counterDice(card('Enchantment Creature', { Counters: { Time: 3, PlusOnePlusOne: 1 } })), [
        { kind: 'Time', label: '3 time counters', faces: [3] },
    ]);
    assert.deepEqual(counterDice(card('Artifact', { Counters: { Charge: 14 } }))[0].faces, [6, 6, 2]);
    assert.deepEqual(counterDice(card('Artifact', { Counters: { Oil: 6 } }))[0].faces, [6]);
});

test('counter names read the way a player says them', () => {
    assert.equal(counterLabel('Firststrike', 1), '1 first strike counter');
    assert.equal(counterLabel('PlusOnePlusOne', 2), '2 +1/+1 counters');
    assert.equal(counterLabel('Lore', 2), '2 lore counters');
});

test('a double-faced card previews the face in play, then its other side', () => {
    assert.deepEqual(previewFaces(card('Land', { image: 'https://x/back.jpg', other_image: 'https://x/front.jpg' })), ['https://x/back.jpg', 'https://x/front.jpg']);
});

test('a single-faced card previews one face', () => {
    assert.deepEqual(previewFaces(card('Instant', { image: 'https://x/bolt.jpg' })), ['https://x/bolt.jpg']);
});

test('an unknown card still previews one, imageless, face', () => {
    assert.deepEqual(previewFaces(card('Instant')), [null]);
});

const spawn = (id: number, extra: Record<string, unknown> = {}) =>
    card('Token Creature — Eldrazi Spawn', { Id: id, CatalogID: 500, Power: 0, Toughness: 1, ...extra });

const spawns = (from: number, count: number, extra: Record<string, unknown> = {}) =>
    Array.from({ length: count }, (_, i) => spawn(from + i, extra));

const shape = (groups: { card: { Id: number }; count: number }[]) => groups.map((group) => [group.card.Id, group.count]);

test('five identical creatures collapse into one counted tile where the first one sat', () => {
    const broodscale = card('Creature — Eldrazi Snake', { Id: 1, CatalogID: 7, Power: 1, Toughness: 1 });

    assert.deepEqual(shape(frontRowGroups([broodscale, ...spawns(10, 5)], new Map())), [
        [1, 1],
        [10, 5],
    ]);
});

test('four identical creatures stay as separate tiles', () => {
    assert.deepEqual(shape(frontRowGroups(spawns(10, 4), new Map())), [
        [10, 1],
        [11, 1],
        [12, 1],
        [13, 1],
    ]);
});

test('tapped and untapped copies are counted apart', () => {
    const groups = frontRowGroups([...spawns(10, 5), ...spawns(20, 5, { Tapped: true })], new Map());

    assert.deepEqual(shape(groups), [
        [10, 5],
        [20, 5],
    ]);
});

test('copies that differ in counters, damage or size are counted apart', () => {
    const groups = frontRowGroups([...spawns(10, 5), spawn(20, { Counters: { PlusOnePlusOne: 1 } }), spawn(21, { Damage: 1 }), spawn(22, { Power: 3 })], new Map());

    assert.deepEqual(shape(groups), [
        [10, 5],
        [20, 1],
        [21, 1],
        [22, 1],
    ]);
});

test('a creature in a block keeps its own tile so the pairing still points at it', () => {
    const groups = frontRowGroups(spawns(10, 6), new Map([[12, 1]]));

    assert.deepEqual(shape(groups), [
        [10, 5],
        [12, 1],
    ]);
});

test('attackers count together when they attack the same player', () => {
    const groups = frontRowGroups([...spawns(10, 5, { Attacking: 2 }), ...spawns(20, 5)], new Map());

    assert.deepEqual(shape(groups), [
        [10, 5],
        [20, 5],
    ]);
});
