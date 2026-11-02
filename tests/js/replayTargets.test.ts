import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse, type Choice } from '@mtgreplay/mtgr';
import { buildTimeline } from '../../resources/js/replayGame.ts';
import { NO_MARKS, playerMark, targetMarks, zoneMark } from '../../resources/js/replayTargets.ts';
import { cardViews, liveObjects, objectZone, stackItems } from '../../resources/js/replayState.ts';
import type { ReplayCardView } from '../../resources/js/types.ts';

const load = (name: string) => buildTimeline(parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')).file.games[0]);

function at(timeline: ReturnType<typeof load>, time: string) {
    const [m, s] = time.split(':').map(Number);
    const moment = timeline.moments.findLast((item) => item.time <= m * 60 + s)!;
    const state = timeline.steps[moment.index].state;
    const cards = cardViews(state, timeline.derived[moment.index], () => null);
    const zones = new Map(liveObjects(state).map((object) => [`#${object.id.n}`, objectZone(object)]));

    return { state, cards, zones, stack: stackItems(state, cards) };
}

test('the Sowing Mycospawn trigger marks the exact Urza\'s Tower it targets, and nothing else', () => {
    const { stack, zones, cards } = at(load('mycospawn-turn-5.mtgr'), '1:57');
    const marks = targetMarks(stack[0].card.choices, zones, cards);

    assert.deepEqual([...marks], ['#17']);
    assert.equal(zones.get('#17'), 'battlefield');
    assert.equal(cards.get('#17')?.name, "Urza's Tower");
});

test('an entry without targets marks nothing', () => {
    const { stack, zones, cards } = at(load('mycospawn-turn-5.mtgr'), '1:57');

    assert.equal(targetMarks(stack[1].card.choices, zones, cards).size, 0);
    assert.equal(targetMarks(stack[2].card.choices, zones, cards).size, 0);
});

test('Thoughtseize marks the player it targets, not the cards in their hand', () => {
    const { stack, zones, cards } = at(load('targeting.mtgr'), '0:36');
    const marks = targetMarks(stack[0].card.choices, zones, cards);

    assert.deepEqual([...marks], [playerMark('PlayerB')]);
});

const target = (n: number): Choice => ({ kind: 'target', amount: null, target: { kind: 'object', object: { id: { n } as never, name: null } } }) as Choice;
const card = (key: string, owner: string): ReplayCardView => ({ key, owner }) as ReplayCardView;

test('a target in the graveyard, exile or hand marks the owner\'s zone as well as the card', () => {
    const zones = new Map([['#1', 'graveyard'], ['#2', 'exile'], ['#3', 'hand'], ['#4', 'stack']]);
    const cards = new Map([['#1', card('#1', 'A')], ['#2', card('#2', 'B')], ['#3', card('#3', 'B')], ['#4', card('#4', 'A')]]);

    assert.deepEqual([...targetMarks([target(1)], zones, cards)].sort(), ['#1', zoneMark('A', 'Graveyard')].sort());
    assert.deepEqual([...targetMarks([target(2)], zones, cards)].sort(), ['#2', zoneMark('B', 'Exile')].sort());
    assert.deepEqual([...targetMarks([target(3)], zones, cards)].sort(), ['#3', zoneMark('B', 'Hand')].sort());
    assert.deepEqual([...targetMarks([target(4)], zones, cards)], ['#4']);
});

test('pointing at one target line marks only that target', () => {
    const zones = new Map([['#1', 'battlefield'], ['#2', 'battlefield']]);
    const cards = new Map([['#1', card('#1', 'A')], ['#2', card('#2', 'A')]]);

    assert.deepEqual([...targetMarks([target(1), target(2)], zones, cards)], ['#1', '#2']);
    assert.deepEqual([...targetMarks([target(1), target(2)], zones, cards, 1)], ['#2']);
});

test('a target that is gone marks only its key, which nothing draws', () => {
    const marks = targetMarks([target(99)], new Map(), new Map());

    assert.deepEqual([...marks], ['#99']);
    assert.equal(NO_MARKS.size, 0);
});

test('a choice made while resolving is not a target: Impulse at 2:24 targets nothing and shows no face-down card', () => {
    const { stack, zones, cards } = at(load('mycospawn-turn-5.mtgr'), '2:24');
    const impulse = stack.find((item) => item.title === 'Impulse')!;

    assert.ok(impulse.card.choices.some((choice) => choice.kind === 'object'));
    assert.deepEqual(impulse.targets, []);
    assert.deepEqual(impulse.chosen, []);
    assert.ok(impulse.choices.every((text) => !text.includes('face-down')));
    assert.equal(targetMarks(impulse.card.choices, zones, cards).size, 0);
});

test('Thoughtseize lists the player it targets, and the card it then chose apart from it, with the card to preview', () => {
    const timeline = load('targeting.mtgr');
    const state = timeline.steps[timeline.moments[36].index].state;
    const cards = cardViews(state, timeline.derived[timeline.moments[36].index], () => null);
    const zones = new Map(liveObjects(state).map((object) => [`#${object.id.n}`, objectZone(object)]));
    const [thoughtseize] = stackItems(state, cards);

    assert.deepEqual(thoughtseize.targets, ['PlayerB']);
    assert.deepEqual(thoughtseize.chosen.map((pick) => pick.name), ['Ragavan, Nimble Pilferer']);
    assert.equal(thoughtseize.chosen[0].card?.name, 'Ragavan, Nimble Pilferer');
    assert.deepEqual([...targetMarks(thoughtseize.card.choices, zones, cards)], [playerMark('PlayerB')]);
});
