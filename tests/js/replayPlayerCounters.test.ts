import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playerCounters } from '../../resources/js/replayPlayerCounters.ts';

test('a player with no counters shows none', () => {
    assert.deepEqual(playerCounters({ poison: 0, counters: {} }), []);
});

test('poison and the other player counters show in rules order, then any other kind by name', () => {
    const kinds = playerCounters({ poison: 3, counters: { ticket: 1, zeal: 2, energy: 4, acorn: 1, rad: 0, experience: 2 } }).map(({ kind, count }) => `${kind} ${count}`);

    assert.deepEqual(kinds, ['poison 3', 'energy 4', 'experience 2', 'ticket 1', 'acorn 1', 'zeal 2']);
});

test('each kind is labelled for its tooltip', () => {
    assert.equal(playerCounters({ poison: 0, counters: { energy: 2 } })[0].label, 'Energy counters');
});
