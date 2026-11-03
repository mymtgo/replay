import type { ReplayCard, ReplayFrame, ReplayFrameContent } from './types';

/** Zones a card can leave for the graveyard in plain sight, so its arrival there is explained. */
const PUBLIC_ZONES = new Set(['Battlefield', 'Stack', 'Exile']);

/** Graveyard id of a resolved spell => the cards it took. */
export type DiscardLinks = Map<number, ReplayCard[]>;

type Resolution = { spell: ReplayCard; taken: ReplayCard[] };

function countByCatalog(cards: ReplayCard[]): Map<number, number> {
    const counts = new Map<number, number>();

    for (const card of cards) {
        counts.set(card.CatalogID, (counts.get(card.CatalogID) ?? 0) + 1);
    }

    return counts;
}

/** The cards not matched, one for one by CatalogID, against `against`. */
function unmatched(cards: ReplayCard[], against: ReplayCard[]): ReplayCard[] {
    const pool = countByCatalog(against);

    return cards.filter((card) => {
        const left = pool.get(card.CatalogID) ?? 0;

        if (left > 0) {
            pool.set(card.CatalogID, left - 1);

            return false;
        }

        return true;
    });
}

/** `cards` with those matching `preferred` by CatalogID first, each order otherwise kept. */
function preferring(cards: ReplayCard[], preferred: ReplayCard[]): ReplayCard[] {
    const rest = unmatched(cards, preferred);

    return [...cards.filter((card) => !rest.includes(card)), ...rest];
}

function handCount(content: ReplayFrameContent, player: number): number | null {
    return content.Players.find((item) => item.Id === player)?.HandCount ?? null;
}

/**
 * The spell that resolved between two frames and the cards it made another
 * player discard, when the frames show it. MTGO never links the two, but a
 * resolution is one tick: the spell leaves the stack and lands in its
 * owner's graveyard while the victim's hand shrinks and their graveyard
 * gains cards no public zone lost. Anything less clear links nothing.
 * Spec docs/specs/2026-09-25-replay-discard-links.md.
 */
function resolution(prev: ReplayFrameContent, next: ReplayFrameContent): Resolution | null {
    const prevCards = prev.Cards ?? [];
    const nextCards = next.Cards ?? [];
    const prevIds = new Set(prevCards.map((card) => card.Id));
    const nextIds = new Set(nextCards.map((card) => card.Id));
    const nextStack = new Set(nextCards.filter((card) => card.Zone === 'Stack').map((card) => card.Id));
    const leaving = prevCards.filter((card) => card.Zone === 'Stack' && !nextStack.has(card.Id));

    if (leaving.length !== 1) {
        return null;
    }

    const [resolving] = leaving;
    const caster = resolving.Controller ?? resolving.Owner;
    const casterBefore = handCount(prev, caster);
    const casterAfter = handCount(next, caster);

    // A spell left its caster's hand when it was cast, so a caster whose hand
    // shrinks as it resolves is resolving an ability that made them discard
    // too (Liliana of the Veil). MTGO puts an ability on the stack under its
    // source's CatalogID, so nothing else tells the two apart.
    if (casterBefore === null || casterAfter === null || casterAfter < casterBefore) {
        return null;
    }
    const vanished = prevCards.filter((card) => PUBLIC_ZONES.has(card.Zone) && !nextIds.has(card.Id));
    const arrivals = (owner: number) => nextCards.filter((card) => card.Zone === 'Graveyard' && card.Owner === owner && !prevIds.has(card.Id));
    const vanishedOf = (owner: number) => vanished.filter((card) => card.Owner === owner && card !== resolving);

    const own = arrivals(resolving.Owner);
    const unexplainedOwn = unmatched(own, vanishedOf(resolving.Owner));
    const spell = unexplainedOwn.find((card) => card.CatalogID === resolving.CatalogID) ?? (unexplainedOwn.length === 1 ? unexplainedOwn[0] : null);

    if (!spell) {
        return null;
    }

    for (const player of next.Players) {
        if (player.Id === caster) {
            continue;
        }

        const before = handCount(prev, player.Id);
        const after = handCount(next, player.Id);

        if (before === null || after === null || before <= after) {
            continue;
        }

        const leftHand = prevCards.filter((card) => card.Zone === 'Hand' && card.Owner === player.Id && !nextIds.has(card.Id));
        const candidates = preferring(unmatched(arrivals(player.Id), vanishedOf(player.Id)), leftHand);
        const taken = candidates.slice(0, before - after);

        if (taken.length) {
            return { spell, taken };
        }
    }

    return null;
}

/**
 * Which spell took which cards, over a whole game. Keyed by graveyard ids,
 * so a link only shows once the viewer reaches the frame the spell resolved.
 */
export function discardLinks(frames: ReplayFrame[]): DiscardLinks {
    const links: DiscardLinks = new Map();

    for (let i = 1; i < frames.length; i++) {
        const found = resolution(frames[i - 1].content, frames[i].content);

        if (found) {
            links.set(found.spell.Id, found.taken);
        }
    }

    return links;
}
