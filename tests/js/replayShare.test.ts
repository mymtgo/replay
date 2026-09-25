import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startFrame } from '../../resources/js/replayShare.ts';

test('startFrame opens on the frame a link names', () => {
    assert.equal(startFrame(143, 200), 143);
});

test('startFrame opens at the start without a frame or with a bad one', () => {
    assert.equal(startFrame(null, 200), 0);
    assert.equal(startFrame(undefined, 200), 0);
    assert.equal(startFrame(Number.NaN, 200), 0);
    assert.equal(startFrame(-4, 200), 0);
    assert.equal(startFrame(2.5, 200), 0);
});

test('startFrame lands on the last frame when a link names one past the end', () => {
    assert.equal(startFrame(900, 200), 199);
});

test('startFrame opens at the start of an empty game', () => {
    assert.equal(startFrame(5, 0), 0);
});
