import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { buildTimeline, gameInfo, matchGames, timeLabel } from '../../resources/js/replayGame.ts';

const fixture = (name: string) => parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')).file.games;

const mycospawn = fixture('mycospawn-turn-5.mtgr')[0];
const match = fixture('match.mtgr');

test('gameInfo reads the seats, the perspective and the result from the tags', () => {
    const info = gameInfo(mycospawn);

    assert.deepEqual(info.players, ['PlayerA', 'PlayerB']);
    assert.equal(info.perspective, 'PlayerA');
    assert.equal(info.winner, 'PlayerA');
    assert.equal(info.won, true);
    assert.equal(info.number, 1);
});

test('a 0-1 result is a loss from Player1 perspective, and the archetypes come through', () => {
    const info = gameInfo(match[0]);

    assert.equal(info.won, false);
    assert.equal(info.archetypes.PlayerA, 'Dimir Murktide');
    assert.equal(info.archetypes.PlayerB, 'Domain Zoo');
    assert.deepEqual(matchGames(match), [
        { id: 0, number: 1 },
        { id: 1, number: 2 },
    ]);
});

test('moments skip keyframe entries, stack snapshots and cards created in a library', () => {
    const { moments } = buildTimeline(mycospawn);
    const types = new Set(moments.map((moment) => moment.line.statement.type));

    for (const skipped of ['keyframe', 'keyframe-player', 'keyframe-object', 'stack', 'stack-spell', 'stack-ability', 'deck', 'pass']) {
        assert.ok(!types.has(skipped as never), `${skipped} is not a moment`);
    }

    assert.ok(moments.every((moment) => !((moment.line.statement.type === 'new-card' || moment.line.statement.type === 'new-hidden') && moment.line.statement.zone.zone === 'library')));
    assert.ok(types.has('move') && types.has('cast') && types.has('priority') && types.has('step'));
});

test('turns start at each turn line, with the pregame first', () => {
    const { moments, turns } = buildTimeline(mycospawn);

    assert.equal(turns[0].number, null);
    assert.equal(turns[0].from, 0);
    assert.deepEqual(
        turns.slice(1).map((turn) => [turn.number, turn.player]),
        [
            [1, 'PlayerA'],
            [2, 'PlayerB'],
            [3, 'PlayerA'],
            [4, 'PlayerB'],
            [5, 'PlayerA'],
        ],
    );
    assert.equal(moments[turns[1].from].line.statement.type, 'turn');
    assert.equal(turns.at(-1)!.to, moments.length);
});

test('the step and priority follow the lines, and combat is cleared at end of combat', () => {
    const { derived, moments } = buildTimeline(mycospawn);
    const at = (predicate: (text: string) => boolean) => derived[moments.find((moment) => predicate(JSON.stringify(moment.line.statement)))!.index];

    assert.equal(at((text) => text.includes('"Sowing Mycospawn"') && text.includes('"cast"')).step, 'precombat-main');
    assert.equal(at((text) => text.includes('"priority","player":"PlayerB"')).priority, 'PlayerB');
    assert.equal(at((text) => text.includes('"resolve"') && text.includes('"n":28')).priority, 'PlayerA', 'the active player gets priority after a resolution');

    const lasting = buildTimeline(fixture('lasting-effects.mtgr')[0]);
    const attackIndex = lasting.moments.find((moment) => moment.line.statement.type === 'attack')!.index;
    assert.equal(lasting.derived[attackIndex].attacking.get('#10')?.kind, 'player');

    const endOfCombat = lasting.moments.find((moment, i) => moment.line.statement.type === 'step' && moment.line.statement.step === 'end-of-combat' && lasting.moments[i].index > attackIndex)!;
    assert.equal(lasting.derived[endOfCombat.index].attacking.size, 0);
});

test('the replayed state at a moment is the state after its line', () => {
    const { steps, moments } = buildTimeline(mycospawn);
    const cast = moments.find((moment) => moment.line.statement.type === 'cast' && moment.line.statement.object.name === 'Sowing Mycospawn')!;

    assert.equal(steps[cast.index].state.stack.map((id) => `#${id.n}`).join(','), '#2');
    assert.equal(steps[cast.index].state.players.PlayerA.life, 19);
});

test('timeLabel writes seconds as the file does', () => {
    assert.equal(timeLabel(0), '0:00');
    assert.equal(timeLabel(117), '1:57');
    assert.equal(timeLabel(3725), '1:02:05');
});
