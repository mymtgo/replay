import type { ReplayCard, ReplayFrame, ReplaySideboardEntry } from './types';

/** One card name that moved between deck and sideboard, and how many copies. */
export type SideboardLine = { key: string; name: string | null; count: number; card: ReplayCard };

export type SideboardChanges = { in: SideboardLine[]; out: SideboardLine[] };

/** Your sideboard as a game began, with the game it came from; what the next game compares against. */
export type ReplaySideboardBaseline = { game: number; cards: ReplayCard[] };

/**
 * Your sideboard as the game began: your cards in the first frame that holds
 * any. Later frames are ignored on purpose, so a wish, a Karn fetch or a
 * companion put into hand mid-game never reads as sideboarding. A companion
 * MTGO displays in its own zone still counts, by its `ActualZone`.
 *
 * Null when no frame records your sideboard.
 */
export function sideboardAtStart(frames: ReplayFrame[]): ReplayCard[] | null {
    for (const frame of frames) {
        const local = frame.content.Players?.find((player) => player.IsLocal)?.Id;

        if (local === undefined) {
            continue;
        }

        const sideboard = (frame.content.Cards ?? []).filter((card) => card.Owner === local && (card.Zone === 'Sideboard' || card.ActualZone === 'Sideboard'));

        if (sideboard.length) {
            return sideboard;
        }
    }

    return null;
}

/**
 * A game's sideboard as it began. The recorded entries win: the sidecar's
 * frames never hold the sideboard, while MTGO's log, which the entries come
 * from, always does. Frames are the fallback for snapshots from before the
 * entries were recorded.
 *
 * Entries become one card per copy with made-up negative ids, which no real
 * MTGO object uses, so they can key a list and its captions.
 */
export function gameSideboard(frames: ReplayFrame[], entries: ReplaySideboardEntry[] | null | undefined): ReplayCard[] | null {
    if (!entries?.length) {
        return sideboardAtStart(frames);
    }

    let id = 0;

    return entries.flatMap((entry) =>
        Array.from({ length: entry.quantity }, () => ({
            Id: --id,
            CatalogID: entry.catalog_id,
            Zone: 'Sideboard',
            Owner: -1,
            name: entry.name,
            type: entry.type,
            image: entry.image,
        })),
    );
}

/** Cards compare by name; an unresolved card by its catalog id. */
function cardKey(card: ReplayCard): string {
    return card.name ?? `#${card.CatalogID}`;
}

function tally(cards: ReplayCard[]): Map<string, { count: number; card: ReplayCard }> {
    const counts = new Map<string, { count: number; card: ReplayCard }>();

    for (const card of cards) {
        const key = cardKey(card);
        const entry = counts.get(key);

        counts.set(key, { count: (entry?.count ?? 0) + 1, card: entry?.card ?? card });
    }

    return counts;
}

/** Copies in `from` beyond those in `than`, one line per card, by name. */
function surplus(from: Map<string, { count: number; card: ReplayCard }>, than: Map<string, { count: number; card: ReplayCard }>): SideboardLine[] {
    const lines: SideboardLine[] = [];

    for (const [key, entry] of from) {
        const count = entry.count - (than.get(key)?.count ?? 0);

        if (count > 0) {
            lines.push({ key, name: entry.card.name ?? null, count, card: entry.card });
        }
    }

    return lines.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * What changed between two sideboards, counted per card. The deck itself is
 * never recorded, so a card that left the sideboard was brought in and one
 * that joined it was taken out. Counting copies keeps a card split between
 * deck and sideboard right: one copy in each, then the deck's copy side out,
 * reads as one taken out.
 */
export function sideboardChanges(before: ReplayCard[], after: ReplayCard[]): SideboardChanges {
    const was = tally(before);
    const now = tally(after);

    return { in: surplus(was, now), out: surplus(now, was) };
}

/** Marks as many copies in the sideboard as were taken out, keyed by card id. */
export function sideboardCaptions(cards: ReplayCard[], changes: SideboardChanges): Map<number, string> {
    const remaining = new Map(changes.out.map((line) => [line.key, line.count]));
    const captions = new Map<number, string>();

    for (const card of cards) {
        const left = remaining.get(cardKey(card)) ?? 0;

        if (left > 0) {
            captions.set(card.Id, 'Taken out');
            remaining.set(cardKey(card), left - 1);
        }
    }

    return captions;
}
