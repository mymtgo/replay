import assert from 'node:assert/strict';
import { test } from 'node:test';
import { replayLayoutFor } from '../../resources/js/replayLayout.ts';

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
