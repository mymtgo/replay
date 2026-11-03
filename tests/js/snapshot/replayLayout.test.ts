import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextCardHeight, replayLayoutFor } from '../../../resources/js/snapshot/replayLayout.ts';

test('phones pick a compact layout by orientation', () => {
    assert.equal(replayLayoutFor(390, 844), 'compact-portrait');
    assert.equal(replayLayoutFor(844, 390), 'compact-landscape');
    assert.equal(replayLayoutFor(600, 550), 'compact-portrait');
});

test('tablets and desktops stay regular', () => {
    assert.equal(replayLayoutFor(768, 1024), 'regular');
    assert.equal(replayLayoutFor(1024, 768), 'regular');
    assert.equal(replayLayoutFor(1440, 900), 'regular');
});

test('spare room on the board is shared between its card rows', () => {
    assert.equal(nextCardHeight(100, 120, 6, [56, 176]), 120);
    assert.equal(nextCardHeight(100, -60, 6, [56, 176]), 90);
    assert.equal(nextCardHeight(100, 5, 6, [56, 176]), 100);
});

test('the card height stays within its bounds', () => {
    assert.equal(nextCardHeight(170, 600, 6, [56, 176]), 176);
    assert.equal(nextCardHeight(60, -600, 6, [56, 176]), 56);
    assert.equal(nextCardHeight(100, 50, 0, [56, 176]), 100);
});
