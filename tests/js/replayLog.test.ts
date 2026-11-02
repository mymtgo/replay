import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { buildTimeline } from '../../resources/js/replayGame.ts';
import { buildLogItems } from '../../resources/js/replayLog.ts';
import { frameAtPosition, timelinePositions, turnAt } from '../../resources/js/replayTimeline.ts';

const fixture = (name: string) => parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')).file.games;

const mycospawn = fixture('mycospawn-turn-5.mtgr')[0];
const timeline = buildTimeline(mycospawn);
const items = buildLogItems(
    timeline.moments,
    timeline.steps.map((step) => step.state),
    timeline.turns,
);
const texts = items.filter((item) => item.kind === 'line').map((item) => item.text);

test('the log words the file in readable sentences', () => {
    const expected = [
        'PlayerA draws Talisman of Impulse',
        'PlayerB mulligans',
        "PlayerA plays Ugin's Labyrinth",
        'Emrakul, the Exigent Doom is exiled (with #7)',
        'PlayerA adds {C}{C}',
        'PlayerA casts Talisman of Impulse',
        'Talisman of Impulse enters the battlefield',
        'A face-down card (#16) is Island',
        'Sowing Mycospawn: kicker',
        "Sowing Mycospawn: When you cast this spell, if it was kicked, exile target land.",
        "Sowing Mycospawn's triggered ability targets Urza's Tower",
        'PlayerA: 19 to 17 life',
        'PlayerA searches their library',
        'Sowing Mycospawn enters the battlefield (3/3)',
        'Impulse goes to the graveyard',
        'Recording incomplete: example conversion ends here; the rest of game 1 is not converted',
    ];

    for (const line of expected) {
        assert.ok(texts.includes(line), `log has "${line}"`);
    }
});

test('priority, passes, steps and snapshots stay out of the log', () => {
    assert.ok(!texts.some((text) => /priority|passes/.test(text)));
    assert.ok(!texts.some((text) => text === 'untap' || text === 'upkeep'));
});

test('each line carries its cause, linked to the object when one caused it', () => {
    const exiled = items.find((item) => item.text.startsWith('Emrakul, the Exigent Doom is exiled'))!;
    const drawn = items.find((item) => item.text === 'PlayerA draws Talisman of Impulse')!;
    const tapped = items.find((item) => item.text === "Ugin's Labyrinth taps")!;

    assert.deepEqual(exiled.cause, { text: "Ugin's Labyrinth's triggered ability", objectKey: '#22' });
    assert.equal(exiled.objectKey, '#5');
    assert.deepEqual(drawn.cause, { text: 'opening hand', objectKey: null });
    assert.deepEqual(tapped.cause, { text: "cost of Ugin's Labyrinth's mana ability", objectKey: '#23' });
});

test('turn headers sit first in their turn and carry the active player', () => {
    const headers = items.filter((item) => item.kind === 'header');

    assert.deepEqual(
        headers.map((item) => [item.text, item.player]),
        [
            ['Turn 1', 'PlayerA'],
            ['Turn 2', 'PlayerB'],
            ['Turn 3', 'PlayerA'],
            ['Turn 4', 'PlayerB'],
            ['Turn 5', 'PlayerA'],
        ],
    );

    const turn5 = headers[4];
    const next = items[items.indexOf(turn5) + 1];
    assert.ok(next.step >= turn5.step);
    assert.equal(turnAt(timeline.turns, turn5.step)?.number, 5);
    assert.equal(turn5.timestamp, '1:33');
});

test('the scrubber spreads moments by game time and finds the moment at a position', () => {
    const positions = timelinePositions([0, 10, 30, 40]);

    assert.deepEqual(positions, [0, 25, 75, 100, 100]);
    assert.equal(frameAtPosition(positions, 26), 1);
    assert.equal(frameAtPosition(positions, 100), 3);
    assert.deepEqual(timelinePositions([5, 5, 5]), [0, 50, 100, 100]);
});
