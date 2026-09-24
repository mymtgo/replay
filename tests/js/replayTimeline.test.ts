import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasNumberedTurns, notableFrames, timestampMs } from '../../resources/js/replayTimeline.ts';

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
