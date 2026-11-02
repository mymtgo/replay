import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { buildTimeline } from '../../resources/js/replayGame.ts';
import { buildLogItems } from '../../resources/js/replayLog.ts';
import { frameAtPosition, pregameEnd, PREGAME_SHARE, stepDuration, timelinePositions, turnAt } from '../../resources/js/replayTimeline.ts';

const near = (actual: number[], expected: number[]) => {
    assert.equal(actual.length, expected.length);
    actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-9, `${value} vs ${expected[i]}`));
};

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
    const positions = timelinePositions([0, 2, 4, 6]);

    near(positions, [0, 100 / 3, 200 / 3, 100, 100]);
    assert.equal(frameAtPosition(positions, 34), 1);
    assert.equal(frameAtPosition(positions, 100), 3);
    assert.deepEqual(timelinePositions([5, 5, 5]), [0, 50, 100, 100]);
});

test('a long wait counts for at most five seconds on the scrubber', () => {
    near(timelinePositions([0, 60, 62]), [0, (5 / 7) * 100, 100, 100]);
});

test('the pregame takes a fixed share of the scrubber, split evenly, however long it ran', () => {
    const positions = timelinePositions([0, 100, 200, 300, 301], 3);

    near(positions.slice(0, 4), [0, PREGAME_SHARE / 3, (PREGAME_SHARE * 2) / 3, PREGAME_SHARE]);
    assert.equal(positions[4], 100);
});

test('playback holds a moment for the real wait, between 0.4 and 2 seconds at 1x', () => {
    const times = [0, 0, 1, 61];

    assert.equal(stepDuration(times, 0, 1), 400);
    assert.equal(stepDuration(times, 1, 1), 1000);
    assert.equal(stepDuration(times, 2, 1), 2000);
    assert.equal(stepDuration(times, 2, 2), 1000);
    assert.equal(stepDuration(times, 3, 1), 400);
});

test('the pregame of the Mycospawn game is a handful of moments with the real clock kept', () => {
    const end = pregameEnd(timeline.turns);
    const pregame = timeline.moments.slice(0, end);

    assert.deepEqual(
        pregame.map((moment) => [moment.line.statement.type, moment.members.length, moment.time]),
        [['pregame', 1, 0], ['roll', 2, 2], ['choose-first', 1, 12], ['move', 14, 12], ['keep', 1, 29], ['mulligan', 16, 32], ['move', 2, 39]],
    );
    assert.equal(timeline.moments[end].line.statement.type, 'turn');
});

test('merged moments keep their lines in the log and show the state after the last one', () => {
    const draws = timeline.moments[3];

    assert.equal(draws.index, draws.members.at(-1)!.index);
    assert.equal(items.filter((item) => item.step === 3 && item.text.includes('draws')).length, 14);
});

