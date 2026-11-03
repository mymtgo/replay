import type { ReplayPlayerView } from './types';

/** One kind of counter a player has, for the HUD. */
export type PlayerCounterView = { kind: string; count: number; label: string };

/** The player counters the rules name, in the order the HUD shows them; any other kind follows, by name. */
const KNOWN = ['poison', 'energy', 'experience', 'rad', 'ticket'];

/** Every kind of counter the player has above zero: poison from its own field, the rest by their `.mtgr` names. */
export function playerCounters(player: Pick<ReplayPlayerView, 'poison' | 'counters'>): PlayerCounterView[] {
    const counts: Record<string, number> = { ...player.counters, poison: player.poison };
    const rank = (kind: string) => (KNOWN.includes(kind) ? KNOWN.indexOf(kind) : KNOWN.length);

    return Object.entries(counts)
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0))
        .map(([kind, count]) => ({ kind, count, label: `${kind.charAt(0).toUpperCase()}${kind.slice(1)} counters` }));
}
