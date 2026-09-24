<script setup lang="ts">
import ReplayBattlefield from './ReplayBattlefield.vue';
import ReplayPlayerHud from './ReplayPlayerHud.vue';
import type { ReplayCard, ReplayPlayer, ReplayZone } from './types';

defineProps<{
    player: ReplayPlayer;
    battlefield: ReplayCard[];
    opponent: boolean;
    active: boolean;
    priority: boolean;
    timeLeft: number | null;
    winner: boolean;
    zoneCounts: Record<ReplayZone, number>;
    openZones: ReplayZone[];
    pairs: Map<number, number>;
}>();

const emit = defineEmits<{
    toggleZone: [zone: ReplayZone, event: MouseEvent];
}>();
</script>

<template>
    <!--
        The HUD sits above or below the board. Once the viewer is wide this
        wrapper dissolves and the viewer's grid places the HUD in the left
        column and the board in the middle one.
    -->
    <div class="flex min-h-0 flex-1 basis-0 flex-col px-2 @7xl:contents" :class="opponent ? 'pt-2' : 'pb-2'">
        <ReplayPlayerHud
            :class="
                opponent
                    ? 'order-0 @7xl:col-start-1 @7xl:row-span-2 @7xl:row-start-1 @7xl:mt-2 @7xl:self-start'
                    : 'order-2 @7xl:col-start-1 @7xl:row-span-2 @7xl:row-start-4 @7xl:mb-2 @7xl:self-end'
            "
            :player="player"
            :opponent="opponent"
            :active="active"
            :priority="priority"
            :time-left="timeLeft"
            :winner="winner"
            :zone-counts="zoneCounts"
            :open-zones="openZones"
            @toggle-zone="(zone, event) => emit('toggleZone', zone, event)"
        />

        <ReplayBattlefield
            class="order-1 @7xl:col-start-2"
            :class="opponent ? '@7xl:row-start-2' : '@7xl:row-start-4'"
            :battlefield="battlefield"
            :opponent="opponent"
            :pairs="pairs"
            :scroll="false"
        />
    </div>
</template>
