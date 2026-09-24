import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normaliseFrames } from '../../resources/js/replayFrames.ts';

const frame = (cards: Array<Record<string, unknown>>) => ({
    timestamp: '2026-09-24T21:59:36Z',
    content: { Players: [], Cards: cards },
});

test('a card MTGO shows with its host but keeps in exile is in exile', () => {
    // Ugin's Labyrinth imprinting Emrakul: displayed on the battlefield, actually exiled.
    const [normalised] = normaliseFrames([frame([{ Id: 480, CatalogID: 61068, Zone: 'Battlefield', ActualZone: 'Exile', Owner: 0 }])]);

    assert.equal(normalised.content.Cards[0].Zone, 'Exile');
});

test('a card playable from exile counts as exiled', () => {
    const [normalised] = normaliseFrames([frame([{ Id: 12, CatalogID: 5, Zone: 'LocalExileCanBePlayed', ActualZone: 'Exile', Owner: 0 }])]);

    assert.equal(normalised.content.Cards[0].Zone, 'Exile');
});

test('other cards keep their zone', () => {
    const cards = [
        { Id: 1, CatalogID: 1, Zone: 'Battlefield', ActualZone: 'Battlefield', Owner: 1 },
        { Id: 2, CatalogID: 2, Zone: 'Hand', Owner: 1 },
        { Id: 3, CatalogID: 3, Zone: 'Companion', ActualZone: 'Sideboard', Owner: 1 },
    ];
    const [normalised] = normaliseFrames([frame(cards)]);

    assert.deepEqual(
        normalised.content.Cards.map((card) => card.Zone),
        ['Battlefield', 'Hand', 'Companion'],
    );
});

test('frames without an exile mismatch are passed through untouched', () => {
    const input = [frame([{ Id: 1, CatalogID: 1, Zone: 'Battlefield', ActualZone: 'Battlefield', Owner: 1 }])];

    assert.equal(normaliseFrames(input)[0], input[0]);
});
