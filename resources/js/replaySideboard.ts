import type { Game, Player } from '@mtgreplay/mtgr';
import { unknownCardName } from './replayWords';
import type { CardImageResolver, ReplayCardView } from './types';

/** One card name that moved between deck and sideboard, and how many copies. */
export type SideboardLine = { key: string; name: string; count: number; card: ReplayCardView };

export type SideboardChanges = { in: SideboardLine[]; out: SideboardLine[] };

/**
 * A card known only by name, for the sideboard list and its changes: no object
 * in the game stands for it. With `sources`, `name` is the label of a card the
 * file names `?`, resolved by its source ids.
 */
export function namedCard(name: string, key: string, owner: Player, images: CardImageResolver, sources?: readonly string[]): ReplayCardView {
    return {
        key,
        id: { n: 0, hypothetical: false },
        kind: 'card',
        name,
        nameUnknown: sources !== undefined,
        face: null,
        image: sources === undefined ? images(name) : images(null, undefined, sources),
        text: null,
        sourceName: null,
        owner,
        controller: owner,
        tapped: false,
        types: null,
        power: null,
        toughness: null,
        counters: {},
        attachedTo: null,
        exiledWith: null,
        attacking: null,
        attackers: 0,
        blocking: null,
        damage: 0,
        choices: [],
    };
}

/**
 * The `side` entries of a player's `deck` block, as copies per name. An entry
 * named `?` counts under its label, "Unknown card #106511"
 * (`sideboardSources` gives its source id). Null when the game lists no deck
 * for them.
 */
export function sideboardNames(game: Game, player: Player): Map<string, number> | null {
    let inDeck = false;
    let found = false;
    const names = new Map<string, number>();

    for (const line of game.body) {
        if (line.kind !== 'statement') {
            continue;
        }

        const s = line.statement;

        if (s.type === 'deck') {
            inDeck = s.player === player;
            found ||= inDeck;
        } else if (s.type === 'deck-entry') {
            if (inDeck && s.board === 'side') {
                const name = s.name ?? unknownCardName(s.src);
                names.set(name, (names.get(name) ?? 0) + s.count);
            }
        } else {
            inDeck = false;
        }
    }

    return found ? names : null;
}

/** The source ids of a player's `?` deck entries (main and side), by their label. */
export function sideboardSources(game: Game, player: Player): Map<string, readonly string[]> {
    let inDeck = false;
    const sources = new Map<string, readonly string[]>();

    for (const line of game.body) {
        if (line.kind !== 'statement') {
            continue;
        }

        const s = line.statement;

        if (s.type === 'deck') {
            inDeck = s.player === player;
        } else if (s.type === 'deck-entry') {
            if (inDeck && s.name === null) {
                sources.set(unknownCardName(s.src), s.src);
            }
        } else {
            inDeck = false;
        }
    }

    return sources;
}

/** The sideboard as the window lists it: one card per copy, by name. `sources` resolves the `?` entries' labels. */
export function sideboardCards(
    names: Map<string, number>,
    owner: Player,
    images: CardImageResolver,
    sources: ReadonlyMap<string, readonly string[]> = new Map(),
): ReplayCardView[] {
    return [...names]
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([name, count]) => Array.from({ length: count }, (_, i) => namedCard(name, `side:${name}:${i}`, owner, images, sources.get(name))));
}

/** Copies in `from` beyond those in `than`, one line per name. */
function surplus(
    from: Map<string, number>,
    than: Map<string, number>,
    owner: Player,
    images: CardImageResolver,
    sources: ReadonlyMap<string, readonly string[]>,
): SideboardLine[] {
    return [...from]
        .map(([name, count]) => ({ name, count: count - (than.get(name) ?? 0) }))
        .filter((line) => line.count > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((line) => ({ key: line.name, name: line.name, count: line.count, card: namedCard(line.name, `change:${line.name}`, owner, images, sources.get(line.name)) }));
}

/**
 * What changed between two games' sideboards, counted per name. A card that
 * left the sideboard was brought in and one that joined it was taken out.
 */
export function sideboardChanges(
    before: Map<string, number>,
    after: Map<string, number>,
    owner: Player,
    images: CardImageResolver,
    sources: ReadonlyMap<string, readonly string[]> = new Map(),
): SideboardChanges {
    return { in: surplus(before, after, owner, images, sources), out: surplus(after, before, owner, images, sources) };
}

/** Marks as many copies in the sideboard as were taken out, keyed by card key. */
export function sideboardCaptions(cards: ReplayCardView[], changes: SideboardChanges): Map<string, string> {
    const remaining = new Map(changes.out.map((line) => [line.name, line.count]));
    const captions = new Map<string, string>();

    for (const card of cards) {
        const left = card.name ? (remaining.get(card.name) ?? 0) : 0;

        if (left > 0 && card.name) {
            captions.set(card.key, 'Taken out');
            remaining.set(card.name, left - 1);
        }
    }

    return captions;
}
