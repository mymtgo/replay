import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { buildTimeline } from '../../resources/js/replayGame.ts';
import { lifeChanges } from '../../resources/js/replayLife.ts';

const fixture = (name: string) => parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')).file.games;

const changes = (name: string, game = 0) => {
    const timeline = buildTimeline(fixture(name)[game]);

    return lifeChanges(
        timeline.moments,
        timeline.steps.map((step) => step.state),
        timeline.turns,
    );
};

test('every life line becomes a change with its cause and turn', () => {
    assert.deepEqual(
        changes('mycospawn-turn-5.mtgr').map(({ player, old, new: next, cause, turn }) => ({ player, old, new: next, cause, turn })),
        [
            { player: 'PlayerA', old: 20, new: 19, cause: "Talisman of Impulse's mana ability", turn: 3 },
            { player: 'PlayerA', old: 19, new: 17, cause: 'Stomping Ground', turn: 3 },
        ],
    );
});

test('a game that opens on a keyframe starts its history from there', () => {
    assert.deepEqual(
        changes('match.mtgr').map(({ old, new: next, cause }) => ({ old, new: next, cause })),
        [{ old: 3, new: 0, cause: 'Lightning Bolt' }],
    );
});
