import type { ReplayCardView } from './types';

/**
 * Whether a permanent belongs on the front row. The file carries no type
 * line, so a creature is a permanent with power and toughness; everything
 * else sits back with the lands.
 */
export function isFrontRow(card: ReplayCardView): boolean {
    return card.power !== null;
}

export function isCreature(card: ReplayCardView): boolean {
    return isFrontRow(card);
}

/** `members` are the keys of every card the tile stands for, the one shown first. */
export type CardGroup = { card: ReplayCardView; count: number; members: string[] };

/** Identical creatures collapse into one counted tile only from this many, so a few copies stay readable apart. */
export const FRONT_ROW_GROUP_MIN = 5;

/**
 * Front row: one tile per card, except where a run of identical creatures
 * (a swarm of tokens) collapses into one counted tile where the first sat.
 * Identical means everything a tile shows: name, tapped, size, counters,
 * damage and who it attacks. A creature in a block, or with cards tucked
 * under it, always keeps its own tile, since the badge or the tucked cards
 * belong to that one card.
 */
export function frontRowGroups(cards: ReplayCardView[], pairs: Map<string, number>, tucked: ReadonlyMap<string, ReplayCardView[]> = new Map()): CardGroup[] {
    const key = (card: ReplayCardView): string | null =>
        pairs.has(card.key) || tucked.has(card.key) ? null : JSON.stringify([card.name, card.face, card.tapped, card.power, card.toughness, card.damage, card.attacking, card.counters]);

    const sizes = new Map<string, number>();
    cards.forEach((card) => {
        const k = key(card);

        if (k !== null) {
            sizes.set(k, (sizes.get(k) ?? 0) + 1);
        }
    });

    const groups: CardGroup[] = [];
    const placed = new Set<string>();

    cards.forEach((card) => {
        const k = key(card);
        const size = k !== null ? (sizes.get(k) ?? 1) : 1;

        if (k === null || size < FRONT_ROW_GROUP_MIN) {
            groups.push({ card, count: 1, members: [card.key] });

            return;
        }

        if (!placed.has(k)) {
            placed.add(k);
            groups.push({ card, count: size, members: cards.filter((other) => key(other) === k).map((other) => other.key) });
        }
    });

    return groups;
}

/** The most cards a pile draws: a playset of any nonbasic shows every copy. */
export const PILE_LAYERS = 4;

/** One side of a pile: the copies drawn, how many there are in all, and the keys of the copies left undrawn. */
export type PilePart = { tapped: boolean; cards: ReplayCardView[]; count: number; hidden: string[] };

export type LandPile = { key: string; parts: PilePart[] };

/**
 * Copies of a back-row permanent sit in one pile, in the order they were
 * first played: untapped copies, then tapped ones, each drawn as its own
 * card so tapping one of four shows. Past four copies the pile still draws
 * four, shared between the two states by how many of each there are (at
 * least one of each state held), and each part counts its hidden copies.
 * A card with cards tucked above it stands alone, since they peek out above
 * that card and would be hidden by its pile mates.
 */
export function landPiles(cards: ReplayCardView[], tucked: ReadonlyMap<string, ReplayCardView[]> = new Map()): LandPile[] {
    const byName = new Map<string, ReplayCardView[]>();

    cards.forEach((card) => {
        const name = tucked.has(card.key) ? card.key : (card.face ?? card.name ?? card.key);
        const copies = byName.get(name);

        if (copies) {
            copies.push(card);
        } else {
            byName.set(name, [card]);
        }
    });

    return [...byName].map(([key, copies]) => {
        const untapped = copies.filter((card) => !card.tapped);
        const tapped = copies.filter((card) => card.tapped);
        let tappedLayers = tapped.length;

        if (copies.length > PILE_LAYERS) {
            tappedLayers = !tapped.length ? 0 : !untapped.length ? PILE_LAYERS : Math.min(PILE_LAYERS - 1, Math.max(1, Math.round((PILE_LAYERS * tapped.length) / copies.length)));
        }

        const untappedLayers = Math.min(untapped.length, PILE_LAYERS - tappedLayers);
        const parts = [
            { tapped: false, cards: untapped.slice(0, untappedLayers), count: untapped.length, hidden: untapped.slice(untappedLayers).map((card) => card.key) },
            { tapped: true, cards: tapped.slice(0, tappedLayers), count: tapped.length, hidden: tapped.slice(tappedLayers).map((card) => card.key) },
        ].filter((part) => part.count > 0);

        return { key, parts };
    });
}

/**
 * What one counter of this kind does to power and toughness, or null when it
 * is not a P/T counter. The file writes them `+1/+1`, `-1/-1` and so on.
 */
export function ptCounterDelta(kind: string): [number, number] | null {
    const match = /^([+-])(\d+)\/([+-])(\d+)$/.exec(kind);

    if (!match) {
        return null;
    }

    const sign = (s: string) => (s === '+' ? 1 : -1);

    return [sign(match[1]) * Number(match[2]), sign(match[3]) * Number(match[4])];
}

export function counterLabel(kind: string, count: number): string {
    return `${count} ${kind} counter${count === 1 ? '' : 's'}`;
}

function liveCounters(card: ReplayCardView): [string, number][] {
    return Object.entries(card.counters).filter(([, count]) => count > 0);
}

/**
 * Every P/T counter on the card netted into one modifier, "+34/+34", or null
 * when there are none or they cancel out.
 */
export function ptCounterLabel(card: ReplayCardView): string | null {
    let power = 0;
    let toughness = 0;
    let any = false;

    liveCounters(card).forEach(([kind, count]) => {
        const pt = ptCounterDelta(kind);

        if (pt) {
            power += pt[0] * count;
            toughness += pt[1] * count;
            any = true;
        }
    });

    if (!any || (power === 0 && toughness === 0)) {
        return null;
    }

    const signed = (n: number) => (n < 0 ? `${n}` : `+${n}`);

    return `${signed(power)}/${signed(toughness)}`;
}

/**
 * Every other counter as dice, the way it would sit on a real table: one die
 * per six, the last showing the remainder. The label names the kind for hover.
 */
export function counterDice(card: ReplayCardView): { kind: string; label: string; faces: number[] }[] {
    return liveCounters(card)
        .filter(([kind]) => ptCounterDelta(kind) === null)
        .map(([kind, count]) => ({
            kind,
            label: counterLabel(kind, count),
            faces: [...Array.from({ length: Math.floor(count / 6) }, () => 6), ...(count % 6 ? [count % 6] : [])],
        }));
}

/** Expand a mana pool into one symbol per mana, in WUBRG then colourless order. */
export function poolSymbols(pool: Record<string, number>): string[] {
    const order = ['W', 'U', 'B', 'R', 'G', 'C'];

    return Object.entries(pool)
        .sort(([a], [b]) => ((order.indexOf(a) + 7) % 7) - ((order.indexOf(b) + 7) % 7))
        .flatMap(([symbol, count]) => Array.from({ length: count }, () => symbol));
}

/**
 * The images the large preview shows: the face in play, then the card's
 * other side when it is double-faced, so a land played from a modal DFC
 * still shows the spell it could have been.
 */
export function previewFaces(card: ReplayCardView, images: (name: string, face?: string) => string | null): (string | null)[] {
    const faces = card.name?.split(' // ') ?? [];

    if (faces.length < 2 || !card.name) {
        return [card.image];
    }

    const showing = card.face ?? faces[0];
    const other = faces.find((face) => face !== showing) ?? faces[1];

    return [card.image, images(card.name, other)];
}
