import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { arrivedBy } from '../../resources/js/replayArrival.ts';
import { buildTimeline } from '../../resources/js/replayGame.ts';

const load = (name: string, game = 0) => {
    const timeline = buildTimeline(parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')).file.games[game]);

    return { timeline, states: timeline.steps.map((step) => step.state) };
};

const noteAt = (file: ReturnType<typeof load>, key: string, zone: 'graveyard' | 'exile') =>
    arrivedBy(file.timeline.moments, file.states, file.timeline.moments.length - 1, key, zone);

test('a discarded card says what made its owner discard it, and when', () => {
    assert.equal(noteAt(load('targeting.mtgr'), '#8', 'graveyard'), 'Discarded by Thoughtseize at 0:45');
});

test('a spell that resolved says so', () => {
    assert.equal(noteAt(load('targeting.mtgr'), '#2', 'graveyard'), 'Resolved at 0:45');
});

test('a destroyed permanent names what destroyed it', () => {
    const match = load('match.mtgr', 1);

    assert.equal(noteAt(match, '#17', 'graveyard'), 'Destroyed by Fatal Push at 3:13');
});

test('a card that never went to the zone has no note', () => {
    assert.equal(noteAt(load('targeting.mtgr'), '#9', 'graveyard'), null);
});
