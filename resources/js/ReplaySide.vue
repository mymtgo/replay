<script setup lang="ts">
import ReplayBattlefield from './ReplayBattlefield.vue';
import ReplayPlayerHud from './ReplayPlayerHud.vue';
import type { SideRows } from './replayRows';
import type { ReplayCardView, ReplayPlayerView, ReplayZone } from './types';

defineProps<{
    player: ReplayPlayerView;
    rows: SideRows;
    opponent: boolean;
    active: boolean;
    priority: boolean;
    winner: boolean;
    zoneCounts: Record<ReplayZone, number>;
    sideboard: boolean;
    openZones: ReplayZone[];
    pairs: Map<string, number>;
    tucked: ReadonlyMap<string, ReplayCardView[]>;
}>();

const emit = defineEmits<{
    toggleZone: [zone: ReplayZone, event: MouseEvent];
}>();
</script>

<template>
    <!--
        One player's half of the table, full width, tinted in their colour and
        ruled off at the centre line. The HUD is a bar above or below the board
        and, once the viewer is wide, a column beside it; the right column
        holds what is not a card (lasting effects, sharing).
    -->
    <section
        class="replay-area flex min-h-0 flex-1 basis-0 flex-col @7xl:grid @7xl:grid-cols-[15rem_minmax(0,1fr)_15rem] @7xl:grid-rows-[minmax(0,1fr)] @7xl:gap-x-2 @7xl:px-2"
        :class="opponent ? 'order-0 border-b-2' : 'replay-area-local order-2 border-t-2'"
        :aria-label="`${player.name}'s area`"
    >
        <div
            class="flex min-h-0 flex-col gap-1.5 px-2 @7xl:col-start-1 @7xl:row-start-1 @7xl:max-h-full @7xl:overflow-y-auto @7xl:px-0 @7xl:py-2"
            :class="opponent ? 'order-0 pt-2 @7xl:self-start @7xl:pt-2' : 'order-2 pb-2 @7xl:self-end @7xl:pb-2'"
        >
            <ReplayPlayerHud
                :player="player"
                :opponent="opponent"
                :active="active"
                :priority="priority"
                :winner="winner"
                :zone-counts="zoneCounts"
                :sideboard="sideboard"
                :open-zones="openZones"
                @toggle-zone="(zone, event) => emit('toggleZone', zone, event)"
            />
        </div>

        <ReplayBattlefield
            class="order-1 @7xl:col-start-2 @7xl:row-start-1"
            :rows="rows"
            :opponent="opponent"
            :pairs="pairs"
            :tucked="tucked"
            :scroll="false"
        />

        <div class="order-3 hidden min-h-0 @7xl:col-start-3 @7xl:row-start-1 @7xl:flex @7xl:flex-col @7xl:py-2" :class="opponent ? 'justify-start' : 'justify-end'">
            <slot />
        </div>
    </section>
</template>
