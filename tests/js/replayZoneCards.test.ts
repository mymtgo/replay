import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zoneCardsFor } from '../../resources/js/replayZoneCards.ts';

const card = (Id: number, Zone: string, Owner = 2) => ({ Id, CatalogID: Id, Zone, Owner });

test('a zone lists its owner cards with the most recent arrival first', () => {
    const cards = [card(30, 'Graveyard'), card(12, 'Graveyard'), card(45, 'Graveyard'), card(50, 'Graveyard', 1), card(60, 'Exile')];

    assert.deepEqual(
        zoneCardsFor(cards, [], 2, 'Graveyard').map((item) => item.Id),
        [45, 30, 12],
    );
});

test('the hand zone lists what was revealed', () => {
    const revealed = [card(7, 'Hand')];

    assert.equal(zoneCardsFor([card(1, 'Graveyard')], revealed, 2, 'Hand'), revealed);
});
