import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isFrontRow } from '../../resources/js/replayCards.ts';

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
