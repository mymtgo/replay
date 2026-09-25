import assert from 'node:assert/strict';
import { test } from 'node:test';
import { counterDice, counterLabel, isFrontRow, previewFaces, ptCounterLabel } from '../../resources/js/replayCards.ts';

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
