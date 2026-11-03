import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { buildTimeline, gameInfo } from '../../resources/js/replayGame.ts';
import { cardViews, effectViews, playerView, stackItems } from '../../resources/js/replayState.ts';
import { sideboardCards, sideboardChanges, sideboardNames } from '../../resources/js/replaySideboard.ts';

const fixture = (name: string) => parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')).file.games;
const images = (name: string, face?: string) => `img:${face ?? name}`;

const mycospawn = fixture('mycospawn-turn-5.mtgr')[0];
const timeline = buildTimeline(mycospawn);
const info = gameInfo(mycospawn);

/** The state and derived facts at the last moment whose line is at or before the given time. */
function at(time: string) {
    const [m, s] = time.split(':').map(Number);
    const seconds = m * 60 + s;
    const moment = timeline.moments.findLast((item) => item.time <= seconds)!;

    return { state: timeline.steps[moment.index].state, derived: timeline.derived[moment.index] };
}

test('at 1:57 the stack holds Sowing Mycospawn under its two triggers, with the target and the kicker', () => {
    const { state, derived } = at('1:57');
    const stack = stackItems(state, cardViews(state, derived, images));

    assert.deepEqual(
        stack.map((item) => item.title),
        ['Sowing Mycospawn', 'Sowing Mycospawn', 'Sowing Mycospawn'],
    );
    assert.equal(stack[0].card.kind, 'ability');
    assert.deepEqual(stack[0].targets, ["Urza's Tower"]);
    assert.match(stack[0].text ?? '', /exile target land/);
    assert.equal(stack[1].targets.length, 0);
    assert.equal(stack[2].card.kind, 'card');
    assert.deepEqual(stack[2].choices, ['kicker']);
    assert.equal(stack[0].card.image, 'img:Sowing Mycospawn');
});

test('players carry life, hand and library sizes, the pool and the perspective', () => {
    const { state, derived } = at('1:50');
    const a = playerView('PlayerA', state, derived, info);
    const b = playerView('PlayerB', state, derived, info);

    assert.equal(a.local, true);
    assert.equal(b.local, false);
    assert.equal(a.life, 19);
    assert.equal(a.librarySize, 52);
    assert.equal(b.handCount, 6);
    assert.deepEqual(a.pool, { G: 1, C: 5 });
});

test('the board shows tapped lands, an exiled card linked to its land, and a hidden hand as backs', () => {
    const { state, derived } = at('1:50');
    const cards = cardViews(state, derived, images);
    const labyrinth = cards.get('#7')!;
    const emrakul = cards.get('#5')!;
    const hidden = cards.get('#18')!;

    assert.equal(labyrinth.tapped, true);
    assert.equal(labyrinth.image, "img:Ugin's Labyrinth");
    assert.equal(emrakul.exiledWith, '#7');
    assert.equal(hidden.name, null);
    assert.equal(hidden.image, null);
});

test('a creature that resolved carries its power and toughness', () => {
    const { state, derived } = at('2:17');
    const mycospawn = cardViews(state, derived, images).get('#2')!;

    assert.equal(mycospawn.power, 3);
    assert.equal(mycospawn.toughness, 3);
});

test('lasting effects list their source and text while they last', () => {
    const lasting = buildTimeline(fixture('lasting-effects.mtgr')[0]);
    const created = lasting.moments.find((moment) => moment.line.statement.type === 'new-effect')!;
    const effects = effectViews(lasting.steps[created.index].state);

    assert.equal(effects.length, 1);
    assert.equal(effects[0].sourceName, 'Tamiyo, Inquisitive Student // Tamiyo, Seasoned Scholar');
    assert.match(effects[0].text ?? '', /Until your next turn/);
});

test('a transformed card shows its back face image', () => {
    const lasting = buildTimeline(fixture('lasting-effects.mtgr')[0]);
    const last = lasting.steps.at(-1)!.state;
    const tamiyo = cardViews(last, lasting.derived.at(-1)!, images).get('#1')!;

    assert.equal(tamiyo.face, 'Tamiyo, Seasoned Scholar');
    assert.equal(tamiyo.image, 'img:Tamiyo, Seasoned Scholar');
});

test('the sideboard comes from the deck block and its changes from the previous game', () => {
    const [game1, game2] = fixture('match.mtgr');
    const before = sideboardNames(game1, 'PlayerA')!;
    const after = sideboardNames(game2, 'PlayerA')!;

    assert.equal(sideboardNames(game1, 'PlayerB'), null);
    assert.equal(sideboardCards(after, 'PlayerA', images).length, 15);

    const changes = sideboardChanges(before, after, 'PlayerA', images);
    assert.deepEqual(
        changes.in.map((line) => [line.name, line.count]),
        [
            ['Spell Snare', 1],
            ['Toxic Deluge', 2],
        ],
    );
    assert.deepEqual(
        changes.out.map((line) => [line.name, line.count]),
        [
            ['Drown in the Loch', 2],
            ['Spell Pierce', 1],
        ],
    );
});

test('an attacker names what it attacks, and the player or permanent it attacks counts its attackers', () => {
    const text = readFileSync(new URL('./fixtures/lasting-effects.mtgr', import.meta.url), 'utf8');
    const attackLine = '#10 "Ragavan, Nimble Pilferer" attack "PlayerA"';
    const atAttack = (source: string) => {
        const game = parse(source).file.games[0];
        const line = game.body.find((body) => body.kind === 'statement' && body.statement.type === 'attack')!;
        const t = buildTimeline(game);
        const moment = t.moments.find((item) => item.members.some((member) => member.line === line))!;
        const state = t.steps[moment.index].state;
        const derived = t.derived[moment.index];

        return { cards: cardViews(state, derived, images), player: playerView('PlayerA', state, derived, gameInfo(game)) };
    };

    const atPlayer = atAttack(text);
    assert.deepEqual(atPlayer.cards.get('#10')?.attacking, { kind: 'player', player: 'PlayerA', label: 'PlayerA' });
    assert.equal(atPlayer.player.attackers, 1);
    assert.equal(atPlayer.cards.get('#1')?.attackers, 0);

    const atTamiyo = atAttack(text.replace(attackLine, '#10 "Ragavan, Nimble Pilferer" attack #1 "Tamiyo, Inquisitive Student // Tamiyo, Seasoned Scholar"'));
    assert.deepEqual(atTamiyo.cards.get('#10')?.attacking, { kind: 'object', key: '#1', label: 'Tamiyo, Seasoned Scholar' });
    assert.equal(atTamiyo.cards.get('#1')?.attackers, 1);
    assert.equal(atTamiyo.player.attackers, 0);
});
