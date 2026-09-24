import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampSize, clampWindow, fromStoredPosition, parseStoredPosition, toStoredPosition, windowStorageKey } from '../../resources/js/replayWindows.ts';

const viewer = { width: 1000, height: 600 };
const size = { width: 320, height: 300 };

test('a window inside the viewer is left alone', () => {
    assert.deepEqual(clampWindow({ left: 100, top: 50 }, size, viewer), { left: 100, top: 50 });
});

test('a window past any edge is pulled back inside', () => {
    assert.deepEqual(clampWindow({ left: 900, top: 500 }, size, viewer), { left: 672, top: 292 });
    assert.deepEqual(clampWindow({ left: -40, top: -10 }, size, viewer), { left: 8, top: 8 });
});

test('a window larger than the viewer pins to the top left edge', () => {
    assert.deepEqual(clampWindow({ left: 50, top: 50 }, { width: 2000, height: 900 }, viewer), { left: 8, top: 8 });
});

test('stored positions round trip through viewer fractions', () => {
    const stored = toStoredPosition({ left: 250, top: 150 }, viewer);

    assert.deepEqual(stored, { x: 0.25, y: 0.25 });
    assert.deepEqual(fromStoredPosition(stored, { width: 2000, height: 1200 }), { left: 500, top: 300 });
});

test('unreadable stored values are rejected', () => {
    for (const raw of [null, '', '{', '[]', '{"x":"a","y":0.1}', '{"x":2,"y":0.5}', '{"x":0.1}']) {
        assert.equal(parseStoredPosition(raw), null, String(raw));
    }

    assert.deepEqual(parseStoredPosition('{"x":0.5,"y":0}'), { x: 0.5, y: 0 });
});

test('a stored size comes back when it is a positive number pair', () => {
    assert.deepEqual(parseStoredPosition('{"x":0.5,"y":0.1,"width":400,"height":300}'), { x: 0.5, y: 0.1, width: 400, height: 300 });
    assert.deepEqual(parseStoredPosition('{"x":0.5,"y":0.1,"width":-4,"height":300}'), { x: 0.5, y: 0.1 });
    assert.deepEqual(parseStoredPosition('{"x":0.5,"y":0.1,"width":"big"}'), { x: 0.5, y: 0.1 });
});

test('a resized window keeps a minimum and stays inside the viewer', () => {
    const min = { width: 220, height: 160 };

    assert.deepEqual(clampSize({ width: 100, height: 50 }, { left: 10, top: 10 }, min, viewer), { width: 220, height: 160 });
    assert.deepEqual(clampSize({ width: 5000, height: 5000 }, { left: 100, top: 50 }, min, viewer), { width: 892, height: 542 });
    assert.deepEqual(clampSize({ width: 400, height: 300 }, { left: 100, top: 50 }, min, viewer), { width: 400, height: 300 });
});

test('keys are per side and zone, with phones kept apart', () => {
    assert.equal(windowStorageKey('opponent', 'Graveyard', false), 'mymtgo-replay:zone-window:opponent:Graveyard');
    assert.equal(windowStorageKey('you', 'Exile', true), 'mymtgo-replay:zone-window:compact:you:Exile');
});
