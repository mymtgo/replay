import { ArrowLeftRight, Ban, Eye, Skull } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { ReplayZone } from './types';

export type ReplayZoneInfo = { zone: ReplayZone; label: string; icon: Component; empty: string };

export const REPLAY_ZONES: Record<ReplayZone, ReplayZoneInfo> = {
    Hand: { zone: 'Hand', label: 'Hand', icon: Eye, empty: 'No known cards in hand' },
    Graveyard: { zone: 'Graveyard', label: 'Graveyard', icon: Skull, empty: 'Graveyard is empty' },
    Exile: { zone: 'Exile', label: 'Exile', icon: Ban, empty: 'Nothing in exile' },
    Sideboard: { zone: 'Sideboard', label: 'Sideboard', icon: ArrowLeftRight, empty: 'Sideboard is empty' },
};

/**
 * Zones a player's HUD can open. An opponent's hand window shows the cards
 * whose faces the file knows, with backs for the rest. Yours is offered
 * only where `ownHand` is set: phones have the hands sheet instead. A
 * sideboard is offered when the game's deck block lists one for the player.
 */
export function hudZones(opponent: boolean, sideboard = false, ownHand = false): ReplayZoneInfo[] {
    const zones = [REPLAY_ZONES.Graveyard, REPLAY_ZONES.Exile];

    if (opponent) {
        return [REPLAY_ZONES.Hand, ...zones];
    }

    return [...(ownHand ? [REPLAY_ZONES.Hand] : []), ...zones, ...(sideboard ? [REPLAY_ZONES.Sideboard] : [])];
}
