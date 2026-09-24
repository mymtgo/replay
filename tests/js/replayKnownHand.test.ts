import assert from 'node:assert/strict';
import { test } from 'node:test';
import { knownOpponentHands } from '../../resources/js/replayKnownHand.ts';

const YOU = 1;
const THEM = 2;

type Card = { Id: number; CatalogID: number; Zone: string; Owner: number; name?: string };

function frame(cards: Card[], handCount = 7) {
    return {
        timestamp: '',
        content: {
            Players: [
                { Id: YOU, Name: 'Hero', IsLocal: true },
                { Id: THEM, Name: 'Villain', HandCount: handCount },
            ],
            Cards: cards,
        },
    };
}

const bolt = (id: number, zone = 'Hand'): Card => ({ Id: id, CatalogID: 100, Zone: zone, Owner: THEM, name: 'Test Bolt' });
const bear = (id: number, zone = 'Hand'): Card => ({ Id: id, CatalogID: 200, Zone: zone, Owner: THEM, name: 'Test Bear' });

const names = (hand: { name?: string | null }[]) => hand.map((card) => card.name);

test('a revealed card stays known after MTGO hides it', () => {
    const hands = knownOpponentHands([frame([]), frame([bolt(10), bear(11)]), frame([]), frame([])]);

    assert.deepEqual(names(hands[0]), []);
    assert.deepEqual(names(hands[3]), ['Test Bolt', 'Test Bear']);
});

test('a known card leaves when it is cast or discarded', () => {
    const hands = knownOpponentHands([frame([bolt(10), bear(11)]), frame([bolt(20, 'Stack')]), frame([bear(21, 'Graveyard')])]);

    assert.deepEqual(names(hands[1]), ['Test Bear']);
    assert.deepEqual(names(hands[2]), []);
});

test('a same-name permanent dying does not remove the known copy', () => {
    const hands = knownOpponentHands([frame([bear(5, 'Battlefield')]), frame([bear(5, 'Battlefield'), bear(11)]), frame([bear(30, 'Graveyard')])]);

    assert.deepEqual(names(hands[2]), ['Test Bear']);
});

test('casting one of two known copies leaves the other', () => {
    const hands = knownOpponentHands([frame([bolt(10), bolt(11)]), frame([bolt(20, 'Stack')])]);

    assert.equal(hands[1].length, 1);
    assert.equal(hands[1][0].Id, 11);
});

test('a copy drawn face down and cast still takes one known copy', () => {
    const hands = knownOpponentHands([frame([bolt(10), bear(11)]), frame([]), frame([bolt(40, 'Stack')])]);

    assert.deepEqual(names(hands[2]), ['Test Bear']);
});

test('known cards beyond the hand count drop, oldest first', () => {
    const hands = knownOpponentHands([frame([bolt(10), bear(11)], 2), frame([], 1)]);

    assert.deepEqual(names(hands[1]), ['Test Bear']);
});

test('the end of game move to sideboard is ignored', () => {
    const hands = knownOpponentHands([frame([bolt(10)]), frame([bolt(50, 'Sideboard')])]);

    assert.deepEqual(names(hands[1]), ['Test Bolt']);
});

test('frames without an opponent keep what is known', () => {
    const empty = { timestamp: '', content: { Players: [{ Id: YOU, Name: 'Hero', IsLocal: true }], Cards: [] } };
    const hands = knownOpponentHands([frame([bolt(10)]), empty]);

    assert.deepEqual(names(hands[1]), ['Test Bolt']);
});
