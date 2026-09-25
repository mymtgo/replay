import type { ReplayCard } from './types';

const FRONT_ROW_TYPES = ['Creature', 'Planeswalker', 'Battle'];

/**
 * Whether a permanent belongs on the front row. A land that is also a
 * creature (Dryad Arbor) fights like one, so it sits with the creatures. An
 * impending enchantment creature with time counters is not a creature yet,
 * so it sits back with the lands and other non-creature permanents.
 */
export function isFrontRow(card: ReplayCard): boolean {
    const type = card.type ?? '';

    if (!type) {
        return card.Power != null;
    }

    if (type.includes('Land') && !type.includes('Creature')) {
        return false;
    }

    if (type.includes('Enchantment') && timeCounters(card) > 0) {
        return false;
    }

    return FRONT_ROW_TYPES.some((kind) => type.includes(kind));
}

export function isLand(card: ReplayCard): boolean {
    return (card.type ?? '').includes('Land');
}

export function isCreature(card: ReplayCard): boolean {
    const type = card.type ?? '';

    return (type ? type.includes('Creature') : card.Power != null) && isFrontRow(card);
}

function timeCounters(card: ReplayCard): number {
    return Object.entries(card.Counters ?? {}).find(([kind]) => kind.toLowerCase() === 'time')?.[1] ?? 0;
}

export type CardGroup = { card: ReplayCard; count: number };

/** Identical creatures collapse into one counted tile only from this many, so a few copies stay readable apart. */
export const FRONT_ROW_GROUP_MIN = 5;

/**
 * Front row: one tile per card, except where a run of identical creatures
 * (a swarm of tokens) collapses into one counted tile where the first sat.
 * Identical means everything a tile shows: card, tapped, size, counters,
 * damage and who it attacks. A creature in a block always keeps its own
 * tile, since the pairing badge names that one card.
 */
export function frontRowGroups(cards: ReplayCard[], pairs: Map<number, number>): CardGroup[] {
    const key = (card: ReplayCard): string | null =>
        pairs.has(card.Id)
            ? null
            : JSON.stringify([card.CatalogID, card.Tapped ?? false, card.Power, card.Toughness, card.Damage ?? 0, card.Attacking ?? null, card.Counters ?? {}]);

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
            groups.push({ card, count: 1 });

            return;
        }

        if (!placed.has(k)) {
            placed.add(k);
            groups.push({ card, count: size });
        }
    });

    return groups;
}

/** The most cards a land pile draws: a playset of any nonbasic shows every copy. */
export const PILE_LAYERS = 4;

/** One side of a land pile: the copies drawn, and how many there are in all. */
export type PilePart = { tapped: boolean; cards: ReplayCard[]; count: number };

export type LandPile = { key: number; parts: PilePart[] };

/**
 * Copies of a land sit in one pile, in the order the lands were first
 * played: untapped copies, then tapped ones, each drawn as its own card so
 * tapping one of four shows. Past four copies the pile still draws four,
 * shared between the two states by how many of each there are (at least one
 * of each state held), and each part counts its hidden copies.
 */
export function landPiles(cards: ReplayCard[]): LandPile[] {
    const byCard = new Map<number, ReplayCard[]>();

    cards.forEach((card) => {
        const copies = byCard.get(card.CatalogID);

        if (copies) {
            copies.push(card);
        } else {
            byCard.set(card.CatalogID, [card]);
        }
    });

    return [...byCard].map(([key, copies]) => {
        const untapped = copies.filter((card) => !card.Tapped);
        const tapped = copies.filter((card) => card.Tapped);
        let tappedLayers = tapped.length;

        if (copies.length > PILE_LAYERS) {
            tappedLayers = !tapped.length ? 0 : !untapped.length ? PILE_LAYERS : Math.min(PILE_LAYERS - 1, Math.max(1, Math.round((PILE_LAYERS * tapped.length) / copies.length)));
        }

        const untappedLayers = Math.min(untapped.length, PILE_LAYERS - tappedLayers);
        const parts = [
            { tapped: false, cards: untapped.slice(0, untappedLayers), count: untapped.length },
            { tapped: true, cards: tapped.slice(0, tappedLayers), count: tapped.length },
        ].filter((part) => part.count > 0);

        return { key, parts };
    });
}

const ptWords: Record<string, number> = { Zero: 0, One: 1, Two: 2 };

/**
 * What one counter of this kind does to power and toughness, or null when it
 * is not a P/T counter. MTGO names them `PlusOnePlusOne`, `MinusTwoMinusOne`
 * and so on; `+1/+1` is how older shared snapshots spelled the common one.
 */
export function ptCounterDelta(kind: string): [number, number] | null {
    const match = /^([+-])(\d)\/([+-])(\d)$/.exec(kind) ?? /^(Plus|Minus)(Zero|One|Two)(Plus|Minus)(Zero|One|Two)$/.exec(kind);

    if (!match) {
        return null;
    }

    const sign = (s: string) => (s === '+' || s === 'Plus' ? 1 : -1);
    const size = (n: string) => ptWords[n] ?? Number(n);

    return [sign(match[1]) * size(match[2]), sign(match[3]) * size(match[4])];
}

/** A counter kind as a reader says it: `PlusOnePlusOne` is "+1/+1", `Firststrike` is "first strike". */
export function counterName(kind: string): string {
    const pt = ptCounterDelta(kind);

    if (pt) {
        const signed = (n: number) => (n < 0 ? `${n}` : `+${n}`);

        return `${signed(pt[0])}/${signed(pt[1])}`;
    }

    const joined: Record<string, string> = { Firststrike: 'first strike', Doublestrike: 'double strike' };

    return joined[kind] ?? kind.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

export function counterLabel(kind: string, count: number): string {
    return `${count} ${counterName(kind)} counter${count === 1 ? '' : 's'}`;
}

function liveCounters(card: ReplayCard): [string, number][] {
    return Object.entries(card.Counters ?? {}).filter(([, count]) => count > 0);
}

/**
 * Every P/T counter on the card netted into one modifier, "+34/+34", or null
 * when there are none or they cancel out.
 */
export function ptCounterLabel(card: ReplayCard): string | null {
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
export function counterDice(card: ReplayCard): { kind: string; label: string; faces: number[] }[] {
    return liveCounters(card)
        .filter(([kind]) => ptCounterDelta(kind) === null)
        .map(([kind, count]) => ({
            kind,
            label: counterLabel(kind, count),
            faces: [...Array.from({ length: Math.floor(count / 6) }, () => 6), ...(count % 6 ? [count % 6] : [])],
        }));
}

/** Expand a mana pool into one symbol per mana, in WUBRG then colourless order. */
export function poolSymbols(pool: Record<string, number> | [] | undefined): string[] {
    if (!pool || Array.isArray(pool)) {
        return [];
    }

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
export function previewFaces(card: ReplayCard): (string | null)[] {
    return card.other_image ? [card.image ?? null, card.other_image] : [card.image ?? null];
}
