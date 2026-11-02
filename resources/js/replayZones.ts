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
 * Zones a player's HUD can open. Your hand has its own strip; an opponent's
 * hand window lists the cards whose faces the file knows. A sideboard is
 * offered when the game's deck block lists one for the player.
 */
export function hudZones(opponent: boolean, sideboard = false): ReplayZoneInfo[] {
    const zones = [REPLAY_ZONES.Graveyard, REPLAY_ZONES.Exile];

    if (opponent) {
        return [REPLAY_ZONES.Hand, ...zones];
    }

    return sideboard ? [...zones, REPLAY_ZONES.Sideboard] : zones;
}
