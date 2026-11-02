import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { buildTimeline } from '../../resources/js/replayGame.ts';
import { cardViews } from '../../resources/js/replayState.ts';

const load = (name: string) => buildTimeline(parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')).file.games[0]);

/** The moments at one second of the recording, in order. */
const during = (timeline: ReturnType<typeof load>, seconds: number) => timeline.moments.flatMap((moment, i) => (Math.floor(moment.time) === seconds ? [i] : []));

test('Thoughtseize shows the seven cards it reveals from the reveal until the spell finishes resolving', () => {
    const timeline = load('targeting.mtgr');
    const [before] = during(timeline, 35);
    const atReveal = during(timeline, 38).at(-1)!;
    const choosing = during(timeline, 45)[0];
    const after = timeline.moments.length - 1;

    assert.equal(timeline.reveals[before].keys.size, 0);
    assert.deepEqual([...timeline.reveals[atReveal].keys].sort(), ['#10', '#11', '#12', '#13', '#14', '#8', '#9']);
    assert.equal(timeline.reveals[atReveal].by, 'Thoughtseize');
    assert.equal(timeline.reveals[choosing].keys.size, 7);
    assert.equal(timeline.reveals[after].keys.size, 0);
});

test('a revealed card that leaves the hand stops being revealed, and every card stays known by name while it is in hand', () => {
    const timeline = load('targeting.mtgr');
    const last = timeline.moments.length - 1;
    const state = timeline.steps[timeline.moments[last].index].state;
    const cards = cardViews(state, timeline.derived[timeline.moments[last].index], () => null);

    assert.equal(timeline.reveals[last].keys.has('#8'), false);
    assert.equal(state.objects['#8'].zone?.zone, 'graveyard');
    assert.equal(cards.get('#9')?.name, 'Lightning Bolt');
    assert.equal(state.objects['#9'].zone?.zone, 'hand');
});

test('a reveal by an object that is not on the stack shows for its own moment only', () => {
    const timeline = load('opening-hand.mtgr');
    const at = timeline.reveals.findIndex((reveal) => reveal.keys.size > 0);

    assert.ok(at >= 0);
    assert.equal(timeline.reveals[at].by, 'Chancellor of the Annex');
    assert.equal(timeline.reveals[at + 1].keys.has('#16'), false);
});
