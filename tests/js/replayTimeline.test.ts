import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveTurns, frameAtPosition, hasNumberedTurns, notableFrames, timelinePositions, timestampMs } from '../../resources/js/replayTimeline.ts';

type Card = { Id: number; CatalogID: number; Zone: string; Owner: number };

function frame(cards: Card[], lives: [number, number] = [20, 20], counts: [number, number] = [7, 7]) {
    return {
        timestamp: '',
        content: {
            Players: [
                { Id: 1, Name: 'Hero', Life: lives[0], HandCount: counts[0] },
                { Id: 2, Name: 'Villain', Life: lives[1], HandCount: counts[1] },
            ],
            Cards: cards,
        },
    };
}

const card = (Id: number, Zone: string): Card => ({ Id, CatalogID: Id, Zone, Owner: 1 });

test('a card reaching the stack or battlefield is notable', () => {
    const frames = [frame([card(1, 'Hand')]), frame([card(2, 'Stack')]), frame([card(3, 'Battlefield')])];

    assert.deepEqual(notableFrames(frames), [1, 2]);
});

test('a permanent leaving the battlefield is notable', () => {
    const frames = [frame([card(3, 'Battlefield')]), frame([card(9, 'Graveyard')])];

    assert.deepEqual(notableFrames(frames), [1]);
});

test('a life change is notable', () => {
    const frames = [frame([]), frame([], [20, 17])];

    assert.deepEqual(notableFrames(frames), [1]);
});

test('hand and library churn alone is not', () => {
    const frames = [frame([card(1, 'Hand')]), frame([card(1, 'Hand'), card(4, 'Hand')], [20, 20], [8, 7]), frame([card(3, 'Battlefield')]), frame([card(3, 'Battlefield')])];

    assert.deepEqual(notableFrames(frames), [2]);
});

test('turns count only when at least one is numbered', () => {
    assert.equal(hasNumberedTurns([{ number: null, from: 0, to: 10, player: null }]), false);
    assert.equal(hasNumberedTurns([{ number: null, from: 0, to: 2, player: null }, { number: 1, from: 2, to: 10, player: 1 }]), true);
});

test('clock and ISO timestamps both read as milliseconds into the day', () => {
    assert.equal(timestampMs('20:47:33'), 74853000);
    assert.equal(timestampMs('20:47:33.250'), 74853250);
    assert.equal(timestampMs('2026-09-19T20:47:33Z'), 74853000);
    assert.equal(timestampMs('2026-09-19T20:47:33.250+00:00'), 74853250);
});

const at = (timestamp: string) => ({ ...frame([]), timestamp });

test('frames sit on the timeline by when they happened, thinking included', () => {
    assert.deepEqual(timelinePositions([at('00:00:00'), at('00:00:01'), at('00:00:04')]), [0, 25, 100, 100]);
});

test('frames without timestamps are spaced evenly', () => {
    assert.deepEqual(timelinePositions([at(''), at(''), at('')]), [0, 50, 100, 100]);
});

test('a position picks the frame showing at that moment', () => {
    const positions = [0, 25, 100, 100];

    assert.equal(frameAtPosition(positions, 0), 0);
    assert.equal(frameAtPosition(positions, 24), 0);
    assert.equal(frameAtPosition(positions, 60), 1);
    assert.equal(frameAtPosition(positions, 100), 2);
    assert.equal(frameAtPosition(positions, -5), 0);
});

function turnFrame(active: number | undefined, step?: string) {
    return { timestamp: '', content: { Players: [{ Id: 1, Name: 'Hero' }, { Id: 2, Name: 'Villain' }], Cards: [], ActivePlayer: active, Step: step } };
}

test('turns follow the active player once it changes', () => {
    const frames = [turnFrame(2), turnFrame(2, 'Upkeep'), turnFrame(2, 'PreCombatMain'), turnFrame(1, 'Upkeep'), turnFrame(2, 'Upkeep')];

    assert.deepEqual(deriveTurns(frames, []), [
        { number: null, from: 0, to: 1, player: null },
        { number: 1, from: 1, to: 3, player: 2 },
        { number: 2, from: 3, to: 4, player: 1 },
        { number: 3, from: 4, to: 5, player: 2 },
    ]);
});

test('an active player that never changes falls back to the log', () => {
    const frames = [turnFrame(1, 'Upkeep'), turnFrame(1, 'EndOfTurn'), turnFrame(1, 'Upkeep')];
    frames.forEach((frame, i) => (frame.timestamp = `12:00:0${i * 5}`));

    const turns = deriveTurns(frames, [
        { timestamp: '12:00:00', message: 'Turn 1:' },
        { timestamp: '12:00:10', message: 'Turn 1:' },
    ]);

    assert.deepEqual(
        turns.map((turn) => [turn.from, turn.player]),
        [
            [0, 1],
            [2, 2],
        ],
    );
});
