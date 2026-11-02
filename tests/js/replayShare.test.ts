import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startStep } from '../../resources/js/replayShare.ts';

test('startStep opens on the frame a link names', () => {
    assert.equal(startStep(143, 200), 143);
});

test('startStep opens at the start without a frame or with a bad one', () => {
    assert.equal(startStep(null, 200), 0);
    assert.equal(startStep(undefined, 200), 0);
    assert.equal(startStep(Number.NaN, 200), 0);
    assert.equal(startStep(-4, 200), 0);
    assert.equal(startStep(2.5, 200), 0);
});

test('startStep lands on the last frame when a link names one past the end', () => {
    assert.equal(startStep(900, 200), 199);
});

test('startStep opens at the start of an empty game', () => {
    assert.equal(startStep(5, 0), 0);
});
