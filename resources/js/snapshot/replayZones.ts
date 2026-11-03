import { ArrowLeftRight, Ban, Eye, Skull } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { ReplayZone } from './types';

export type ReplayZoneInfo = { zone: ReplayZone; label: string; icon: Component; empty: string };

export const REPLAY_ZONES: Record<ReplayZone, ReplayZoneInfo> = {
    Hand: { zone: 'Hand', label: 'Hand', icon: Eye, empty: 'No cards revealed' },
    Graveyard: { zone: 'Graveyard', label: 'Graveyard', icon: Skull, empty: 'Graveyard is empty' },
    Exile: { zone: 'Exile', label: 'Exile', icon: Ban, empty: 'Nothing in exile' },
    Sideboard: { zone: 'Sideboard', label: 'Sideboard', icon: ArrowLeftRight, empty: 'Sideboard is empty' },
};

/**
 * Zones a player's HUD can open. Your hand has its own strip; an opponent's
 * hand only holds the cards MTGO has revealed, such as to a Thoughtseize.
 * Only your sideboard is ever recorded, and only when the game has one.
 */
export function hudZones(opponent: boolean, sideboard = false): ReplayZoneInfo[] {
    const zones = [REPLAY_ZONES.Graveyard, REPLAY_ZONES.Exile];

    if (opponent) {
        return [REPLAY_ZONES.Hand, ...zones];
    }

    return sideboard ? [...zones, REPLAY_ZONES.Sideboard] : zones;
}
