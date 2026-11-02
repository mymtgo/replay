import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { buildTimeline } from '../../resources/js/replayGame.ts';
import { arrivedBy } from '../../resources/js/replayArrival.ts';
import { pregameBadges, pregameView } from '../../resources/js/replayPregame.ts';

const load = (name: string) => {
    const game = parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')).file.games[0];
    const timeline = buildTimeline(game);

    return { game, timeline, states: timeline.steps.map((step) => step.state) };
};

const seats = ['PlayerA', 'PlayerB'];
const mycospawn = load('mycospawn-turn-5.mtgr');
const opening = load('opening-hand.mtgr');

const view = (data: ReturnType<typeof load>, step: number) => pregameView(data.game, data.states, data.timeline.moments[step], seats)!;

test('nothing shows before the first roll', () => {
    assert.equal(pregameView(mycospawn.game, mycospawn.states, mycospawn.timeline.moments[0], seats), null);
});

test('the roll is one moment with both dice and the winner', () => {
    const roll = view(mycospawn, 1);

    assert.deepEqual(roll.round?.rolls.map((r) => [r.player, r.result, r.face]), [['PlayerB', 2, 2], ['PlayerA', 5, 5]]);
    assert.equal(roll.round?.winner, 'PlayerA');
    assert.deepEqual(pregameBadges(roll, 'PlayerA').map((b) => b.text), ['Won die roll']);
    assert.deepEqual(pregameBadges(roll, 'PlayerB'), []);
});

test('the choice marks who is on the play and who is on the draw', () => {
    const choice = view(mycospawn, 2);

    assert.deepEqual(pregameBadges(choice, 'PlayerA').map((b) => b.text), ['Won die roll', 'On the play']);
    assert.deepEqual(pregameBadges(choice, 'PlayerB').map((b) => b.text), ['On the draw']);
});

test('a mulligan is one moment, then the bottoming and the keep, with the hand size they keep', () => {
    const mulligan = view(mycospawn, 5);
    assert.deepEqual(pregameBadges(mulligan, 'PlayerB').map((b) => b.text), ['On the draw', 'Mulligan']);

    const kept = view(mycospawn, 6);
    assert.deepEqual(pregameBadges(kept, 'PlayerB').map((b) => b.text), ['On the draw', 'Mulligan', 'Keeps 6']);
    assert.deepEqual(kept.players.find((p) => p.name === 'PlayerB')?.bottomed, [null], 'the opponent\'s bottomed card is a card back');
    assert.equal(kept.players.find((p) => p.name === 'PlayerA')?.keptWith, 7);
});

test('opening-hand actions show one per moment', () => {
    const actions = opening.timeline.moments.slice(0, 16).map((_, step) => view(opening, step)?.action).filter(Boolean);

    assert.deepEqual(actions, [
        '7 cards are exiled (Serum Powder)',
        'Leyline of the Void enters the battlefield',
        'Chancellor of the Annex is revealed',
        'A face-down card (#8) is Gemstone Caverns',
        'Gemstone Caverns enters the battlefield',
        'A face-down card (#9) is Lightning Bolt',
        'Lightning Bolt is exiled (Gemstone Caverns)',
    ]);
});

const lastStep = opening.timeline.moments.length - 1;
const exiled = (key: string, step = lastStep) => arrivedBy(opening.timeline.moments, opening.states, step, key, 'exile');

test('a card exiled by an object says who and when', () => {
    assert.equal(exiled('#9'), 'Exiled by Gemstone Caverns at 0:36');
    assert.equal(exiled('#2'), 'Exiled by Serum Powder at 0:17');
});

test('a card not yet exiled, or never, has no exile context', () => {
    assert.equal(exiled('#9', 11), null);
    assert.equal(exiled('#8'), null);
});
