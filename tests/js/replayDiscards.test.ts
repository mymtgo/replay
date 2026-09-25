import assert from 'node:assert/strict';
import { test } from 'node:test';
import { discardLinks } from '../../resources/js/replayDiscards.ts';

const YOU = 1;
const THEM = 0;

type Card = { Id: number; CatalogID: number; Zone: string; Owner: number; Controller?: number; name?: string | null; type?: string | null };

/** One frame; `hands` gives each player's HandCount, and a missing entry leaves it unset. */
function frame(cards: Card[], hands: Partial<Record<number, number>> = {}) {
    return {
        timestamp: '',
        content: {
            Players: [
                { Id: YOU, Name: 'Hero', IsLocal: true, HandCount: hands[YOU] },
                { Id: THEM, Name: 'Villain', HandCount: hands[THEM] },
            ],
            Cards: cards,
        },
    };
}

const THOUGHTSEIZE = 82836;
const SHEPHERD = 142687;
const PHANTOM = 125581;

const seizeOnStack: Card = { Id: 539, CatalogID: THOUGHTSEIZE, Zone: 'Stack', Owner: YOU, Controller: YOU, name: 'Thoughtseize' };
const seizeInGraveyard: Card = { Id: 541, CatalogID: THOUGHTSEIZE, Zone: 'Graveyard', Owner: YOU, Controller: YOU, name: 'Thoughtseize' };
const revealedPhantom: Card = { Id: 438, CatalogID: PHANTOM, Zone: 'Hand', Owner: THEM, name: 'White Orchid Phantom' };
const revealedShepherd: Card = { Id: 500, CatalogID: SHEPHERD, Zone: 'Hand', Owner: THEM, name: 'Starfield Shepherd' };
const discardedShepherd: Card = { Id: 540, CatalogID: SHEPHERD, Zone: 'Graveyard', Owner: THEM, name: 'Starfield Shepherd' };
const oldLand: Card = { Id: 485, CatalogID: 1, Zone: 'Graveyard', Owner: THEM, name: 'Flooded Strand' };

const ids = (cards: { Id: number }[] | undefined) => cards?.map((card) => card.Id);

test('a Thoughtseize resolving links the spell and the card it took, both ways', () => {
    const links = discardLinks([
        frame([oldLand, seizeOnStack, revealedPhantom, revealedShepherd], { [YOU]: 2, [THEM]: 3 }),
        frame([oldLand, discardedShepherd, seizeInGraveyard], { [YOU]: 2, [THEM]: 2 }),
    ]);

    assert.deepEqual(ids(links.get(541)), [540]);
    assert.equal(links.size, 1);
});

test('removal putting a creature in the graveyard links nothing, since no hand shrank', () => {
    const links = discardLinks([
        frame(
            [
                { Id: 600, CatalogID: 7, Zone: 'Stack', Owner: YOU, Controller: YOU, name: 'Fatal Push' },
                { Id: 610, CatalogID: 8, Zone: 'Battlefield', Owner: THEM, name: 'Ocelot Pride' },
            ],
            { [YOU]: 3, [THEM]: 3 },
        ),
        frame(
            [
                { Id: 620, CatalogID: 7, Zone: 'Graveyard', Owner: YOU, name: 'Fatal Push' },
                { Id: 621, CatalogID: 8, Zone: 'Graveyard', Owner: THEM, name: 'Ocelot Pride' },
            ],
            { [YOU]: 3, [THEM]: 3 },
        ),
    ]);

    assert.equal(links.size, 0);
});

test('two objects leaving the stack at once links nothing', () => {
    const links = discardLinks([
        frame([seizeOnStack, { Id: 530, CatalogID: 9, Zone: 'Stack', Owner: YOU, name: 'Triggered Ability from Guide of Souls' }, revealedShepherd], { [YOU]: 2, [THEM]: 3 }),
        frame([discardedShepherd, seizeInGraveyard], { [YOU]: 2, [THEM]: 2 }),
    ]);

    assert.equal(links.size, 0);
});

test('a creature that died in the same frame is not taken for the discard', () => {
    const links = discardLinks([
        frame([seizeOnStack, { Id: 610, CatalogID: 8, Zone: 'Battlefield', Owner: THEM, name: 'Ocelot Pride' }], { [YOU]: 2, [THEM]: 3 }),
        frame([{ Id: 621, CatalogID: 8, Zone: 'Graveyard', Owner: THEM, name: 'Ocelot Pride' }, discardedShepherd, seizeInGraveyard], { [YOU]: 2, [THEM]: 2 }),
    ]);

    assert.deepEqual(ids(links.get(541)), [540]);
});

test('frames without hand counts link nothing', () => {
    const links = discardLinks([frame([seizeOnStack, revealedShepherd]), frame([discardedShepherd, seizeInGraveyard])]);

    assert.equal(links.size, 0);
});

test('a hand count missing from one frame of the pair links nothing', () => {
    const links = discardLinks([
        frame([seizeOnStack, revealedShepherd], { [YOU]: 2, [THEM]: 3 }),
        frame([discardedShepherd, seizeInGraveyard], { [YOU]: 2 }),
    ]);

    assert.equal(links.size, 0);
});

test('discarding your own card to your own spell links nothing', () => {
    const links = discardLinks([
        frame([seizeOnStack, { Id: 700, CatalogID: 7, Zone: 'Hand', Owner: YOU, name: 'Fatal Push' }], { [YOU]: 3, [THEM]: 3 }),
        frame([{ Id: 701, CatalogID: 7, Zone: 'Graveyard', Owner: YOU, name: 'Fatal Push' }, seizeInGraveyard], { [YOU]: 2, [THEM]: 3 }),
    ]);

    assert.equal(links.size, 0);
});

test('an opponent Thoughtseizing you links the card in your graveyard', () => {
    const links = discardLinks([
        frame(
            [
                { Id: 800, CatalogID: THOUGHTSEIZE, Zone: 'Stack', Owner: THEM, Controller: THEM, name: 'Thoughtseize' },
                { Id: 801, CatalogID: 7, Zone: 'Hand', Owner: YOU, name: 'Fatal Push' },
                { Id: 802, CatalogID: 6, Zone: 'Hand', Owner: YOU, name: 'Marsh Flats' },
            ],
            { [YOU]: 2, [THEM]: 4 },
        ),
        frame(
            [
                { Id: 802, CatalogID: 6, Zone: 'Hand', Owner: YOU, name: 'Marsh Flats' },
                { Id: 803, CatalogID: 7, Zone: 'Graveyard', Owner: YOU, name: 'Fatal Push' },
                { Id: 804, CatalogID: THOUGHTSEIZE, Zone: 'Graveyard', Owner: THEM, name: 'Thoughtseize' },
            ],
            { [YOU]: 1, [THEM]: 4 },
        ),
    ]);

    assert.deepEqual(ids(links.get(804)), [803]);
});

test('the card that left the hand wins over one milled in the same frame', () => {
    const milled: Card = { Id: 535, CatalogID: 3, Zone: 'Graveyard', Owner: THEM, name: 'Island' };
    const links = discardLinks([
        frame([seizeOnStack, revealedShepherd], { [YOU]: 2, [THEM]: 3 }),
        frame([milled, discardedShepherd, seizeInGraveyard], { [YOU]: 2, [THEM]: 2 }),
    ]);

    assert.deepEqual(ids(links.get(541)), [540]);
});

test('a hand drop bigger than the new graveyard cards links only those cards', () => {
    const links = discardLinks([
        frame([seizeOnStack, revealedShepherd], { [YOU]: 2, [THEM]: 4 }),
        frame([discardedShepherd, seizeInGraveyard], { [YOU]: 2, [THEM]: 2 }),
    ]);

    assert.deepEqual(ids(links.get(541)), [540]);
});

test('a spell landing in the graveyard under its whole-card id still links', () => {
    const links = discardLinks([
        frame([{ Id: 539, CatalogID: 70523, Zone: 'Stack', Owner: YOU, Controller: YOU, name: 'Fire' }, revealedShepherd], { [YOU]: 2, [THEM]: 3 }),
        frame([discardedShepherd, { Id: 541, CatalogID: 70527, Zone: 'Graveyard', Owner: YOU, name: 'Fire // Ice' }], { [YOU]: 2, [THEM]: 2 }),
    ]);

    assert.deepEqual(ids(links.get(541)), [540]);
});

test('no frames, or one frame, gives empty links', () => {
    assert.equal(discardLinks([]).size, 0);
    assert.equal(discardLinks([frame([seizeOnStack], { [YOU]: 2, [THEM]: 3 })]).size, 0);
});

test('a triggered ability resolving links nothing, since it never reaches a graveyard', () => {
    const links = discardLinks([
        frame([{ Id: 543, CatalogID: 125685, Zone: 'Stack', Owner: YOU, Controller: YOU, name: 'Triggered Ability from Emperor of Bones' }, revealedShepherd], { [YOU]: 2, [THEM]: 3 }),
        frame([discardedShepherd], { [YOU]: 2, [THEM]: 2 }),
    ]);

    assert.equal(links.size, 0);
});

test('an ability making each player discard links nothing, since its controller discarded too', () => {
    const liliana: Card = { Id: 29, CatalogID: 5000, Zone: 'Battlefield', Owner: THEM, Controller: THEM, name: 'Liliana of the Veil' };
    const links = discardLinks([
        frame(
            [
                liliana,
                { Id: 30, CatalogID: 5000, Zone: 'Stack', Owner: THEM, Controller: THEM, name: 'Liliana of the Veil' },
                { Id: 33, CatalogID: 7, Zone: 'Hand', Owner: YOU, name: 'Fatal Push' },
            ],
            { [YOU]: 2, [THEM]: 3 },
        ),
        frame(
            [
                liliana,
                { Id: 34, CatalogID: 6000, Zone: 'Graveyard', Owner: THEM, name: 'Swamp' },
                { Id: 31, CatalogID: 7, Zone: 'Graveyard', Owner: YOU, name: 'Fatal Push' },
            ],
            { [YOU]: 1, [THEM]: 2 },
        ),
    ]);

    assert.equal(links.size, 0);
});

test('an ability whose source dies as it resolves is not taken for a spell', () => {
    const links = discardLinks([
        frame(
            [
                { Id: 39, CatalogID: 900, Zone: 'Battlefield', Owner: YOU, Controller: YOU, name: 'Tinder Wall' },
                { Id: 40, CatalogID: 900, Zone: 'Stack', Owner: YOU, Controller: YOU, name: 'Tinder Wall' },
                revealedShepherd,
            ],
            { [YOU]: 2, [THEM]: 3 },
        ),
        frame([{ Id: 41, CatalogID: 900, Zone: 'Graveyard', Owner: YOU, name: 'Tinder Wall' }, discardedShepherd], { [YOU]: 2, [THEM]: 2 }),
    ]);

    assert.equal(links.size, 0);
});

test("a caster whose hand count is unknown links nothing, since the ability check can't run", () => {
    const links = discardLinks([
        frame([seizeOnStack, revealedShepherd], { [THEM]: 3 }),
        frame([discardedShepherd, seizeInGraveyard], { [THEM]: 2 }),
    ]);

    assert.equal(links.size, 0);
});
