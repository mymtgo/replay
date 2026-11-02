import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { buildTimeline } from '../../resources/js/replayGame.ts';
import { frontRowGroups } from '../../resources/js/replayCards.ts';
import { tuckedKeys, tuckedUnder } from '../../resources/js/replayLinks.ts';
import { cardViews, liveObjects, objectZone } from '../../resources/js/replayState.ts';
import type { ReplayCardView } from '../../resources/js/types.ts';

const game = parse(readFileSync(new URL('./fixtures/mycospawn-turn-5.mtgr', import.meta.url), 'utf8')).file.games[0];
const timeline = buildTimeline(game);

function board(time: string) {
    const [m, s] = time.split(':').map(Number);
    const moment = timeline.moments.findLast((item) => item.time <= m * 60 + s)!;
    const state = timeline.steps[moment.index].state;
    const cards = [...cardViews(state, timeline.derived[moment.index], () => null).values()];
    const zones = new Map(liveObjects(state).map((object) => [`#${object.id.n}`, objectZone(object)]));

    return { cards, zones };
}

function card(key: string, over: Partial<ReplayCardView> = {}): ReplayCardView {
    return {
        key, id: { n: Number(key.slice(1)) } as ReplayCardView['id'], kind: 'card', name: key, face: null, image: null, text: null, sourceName: null,
        owner: 'a', controller: 'a', tapped: false, power: null, toughness: null, counters: {}, attachedTo: null, exiledWith: null,
        attacking: null, blocking: null, damage: 0, choices: [], ...over,
    };
}

test('Emrakul is not tucked before Ugin\'s Labyrinth exiles it, and sits under the Labyrinth after', () => {
    const before = board('0:42');
    assert.equal(tuckedUnder(before.cards, before.zones).size, 0);

    const after = board('0:50');
    const tucked = tuckedUnder(after.cards, after.zones);
    assert.deepEqual(tucked.get('#7')?.map((c) => c.name), ['Emrakul, the Exigent Doom']);
    assert.equal(after.zones.get('#5'), 'exile');
});

test('an attached permanent is tucked under its host and nothing else', () => {
    const cards = [card('#1', { power: 2, toughness: 2 }), card('#2', { attachedTo: '#1' }), card('#3')];
    const zones = new Map([['#1', 'battlefield'], ['#2', 'battlefield'], ['#3', 'battlefield']]);
    const tucked = tuckedUnder(cards, zones);

    assert.deepEqual(tucked.get('#1')?.map((c) => c.key), ['#2']);
    assert.deepEqual([...tuckedKeys(tucked)], ['#2']);
});

test('a link to a host off the battlefield leaves the card where it was', () => {
    const cards = [card('#1'), card('#2', { attachedTo: '#1' }), card('#3', { exiledWith: '#1' })];
    const zones = new Map([['#1', 'graveyard'], ['#2', 'battlefield'], ['#3', 'exile']]);

    assert.equal(tuckedUnder(cards, zones).size, 0);
});

test('a card exiled with a host is tucked only while it is in exile', () => {
    const cards = [card('#1'), card('#2', { exiledWith: '#1' })];

    assert.equal(tuckedUnder(cards, new Map([['#1', 'battlefield'], ['#2', 'exile']])).size, 1);
    assert.equal(tuckedUnder(cards, new Map([['#1', 'battlefield'], ['#2', 'hand']])).size, 0);
});

test('equipment attached to a host that is itself attached stays in its row', () => {
    const cards = [card('#1'), card('#2', { attachedTo: '#1' }), card('#3', { attachedTo: '#2' })];
    const zones = new Map([['#1', 'battlefield'], ['#2', 'battlefield'], ['#3', 'battlefield']]);
    const tucked = tuckedUnder(cards, zones);

    assert.deepEqual([...tuckedKeys(tucked)], ['#2']);
});

test('a creature with cards tucked under it does not collapse into a counted swarm tile', () => {
    const swarm = Array.from({ length: 6 }, (_, i) => card(`#${i + 1}`, { name: 'Eldrazi Spawn', power: 0, toughness: 1 }));
    const tucked = new Map([['#1', [card('#9')]]]);

    assert.equal(frontRowGroups(swarm, new Map()).length, 1);
    const groups = frontRowGroups(swarm, new Map(), tucked);

    assert.deepEqual(groups.map((group) => [group.card.key, group.count]), [['#1', 1], ['#2', 5]]);
});
