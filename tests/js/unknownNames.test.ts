import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from '@mtgreplay/mtgr';
import { buildTimeline } from '../../resources/js/replayGame.ts';
import { buildLogItems } from '../../resources/js/replayLog.ts';
import { cardViews } from '../../resources/js/replayState.ts';
import { sideboardCards, sideboardNames, sideboardSources } from '../../resources/js/replaySideboard.ts';

// The standard's conformance file for `?` card names (decision 0048).
const game = parse(readFileSync(new URL('./fixtures/unknown-names.mtgr', import.meta.url), 'utf8')).file.games[0];
const timeline = buildTimeline(game);

/** What the resolver was asked, and its answer: art only for arena:106777. */
const asked: [string | null, string | undefined, readonly string[] | undefined][] = [];
const images = (name: string | null, face?: string, sources?: readonly string[]) => {
    asked.push([name, face, sources]);
    if (name !== null) {
        return `img:${name}`;
    }
    return sources?.includes('arena:106777') ? 'img:arena:106777' : null;
};

function at(seconds: number) {
    const moment = timeline.moments.findLast((item) => item.time <= seconds)!;

    return { state: timeline.steps[moment.index].state, derived: timeline.derived[moment.index] };
}

test('a card named ? reads as Unknown card with its source id, and is no face-down card', () => {
    const { state, derived } = at(39);
    const cards = cardViews(state, derived, images);
    const bear = cards.get('#8')!;
    const token = cards.get('#17')!;
    const inHand = cards.get('#3')!;
    const hidden = cards.get('#9')!;

    assert.equal(bear.name, 'Unknown card #106777');
    assert.equal(bear.nameUnknown, true);
    assert.equal(token.name, 'Unknown card #106778');
    assert.equal(token.nameUnknown, true);
    assert.equal(inHand.name, 'Unknown card #106282');
    assert.equal(hidden.name, null);
    assert.equal(hidden.nameUnknown, false);
});

test('the host resolver is still asked by source id, and its image is used', () => {
    asked.length = 0;
    const { state, derived } = at(39);
    const cards = cardViews(state, derived, images);

    assert.equal(cards.get('#8')!.image, 'img:arena:106777');
    assert.equal(cards.get('#3')!.image, null);
    assert.ok(asked.some(([name, , sources]) => name === null && sources?.[0] === 'arena:106282'));
    assert.ok(!asked.some(([name]) => name?.startsWith('Unknown card')), 'the label is never looked up as a name');
});

test('the log names unknown cards by their label', () => {
    const items = buildLogItems(
        timeline.moments,
        timeline.steps.map((step) => step.state),
        timeline.turns,
    );
    const texts = items.filter((item) => item.kind === 'line').map((item) => item.text);

    assert.ok(texts.includes('A face-down card (#8) is Unknown card #106777'), texts.join('\n'));
    assert.ok(texts.includes('PlayerB casts Unknown card #106777'), texts.join('\n'));
    assert.ok(texts.includes('PlayerB creates a token: Unknown card #106778'), texts.join('\n'));
    assert.ok(!texts.some((text) => text.includes('null')), texts.join('\n'));
});

test('unknown deck entries list by their label and resolve by source id', () => {
    const names = sideboardNames(game, 'PlayerA')!;

    assert.deepEqual([...names], [
        ['Abrade', 2],
        ['Unknown card #106511', 1],
    ]);
    asked.length = 0;
    const cards = sideboardCards(names, 'PlayerA', images, sideboardSources(game, 'PlayerA'));
    const unknown = cards.find((card) => card.name === 'Unknown card #106511')!;

    assert.equal(unknown.nameUnknown, true);
    assert.ok(asked.some(([name, , sources]) => name === null && sources?.[0] === 'arena:106511'));
});
