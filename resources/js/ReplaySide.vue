<script setup lang="ts">
import { computed } from 'vue';
import ReplayCardTile from './ReplayCardTile.vue';
import ReplayPlayerHud from './ReplayPlayerHud.vue';
import { backRowGroups, isFrontRow, type CardGroup } from './replayCards';
import type { ReplayCard, ReplayPlayer, ReplayZone } from './types';

const props = defineProps<{
    player: ReplayPlayer;
    battlefield: ReplayCard[];
    opponent: boolean;
    active: boolean;
    priority: boolean;
    timeLeft: number | null;
    winner: boolean;
    zoneCounts: Record<ReplayZone, number>;
    openZone: ReplayZone | null;
    pairs: Map<number, number>;
}>();

const emit = defineEmits<{
    toggleZone: [zone: ReplayZone, event: MouseEvent];
}>();

const front = computed<CardGroup[]>(() => props.battlefield.filter(isFrontRow).map((card) => ({ card, count: 1 })));
const back = computed(() => backRowGroups(props.battlefield.filter((card) => !isFrontRow(card))));

/**
 * Creatures face the centre line; lands and other permanents sit behind them.
 * Creatures take the larger share, since lands already stack into ×N groups.
 */
const rows = computed(() => {
    const creatures = { key: 'front', groups: front.value, grow: 1.5 };
    const lands = { key: 'back', groups: back.value, grow: 1 };

    return props.opponent ? [lands, creatures] : [creatures, lands];
});
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
            :open-zone="openZone"
            @toggle-zone="(zone, event) => emit('toggleZone', zone, event)"
        />

        <!--
            An empty row shrinks to its padding and hands its height to the other.
            Rows stop growing at a comfortable card size, and what is left over
            gathers on the far side so the cards stay near the centre line.
        -->
        <div
            class="order-1 flex min-h-0 min-w-0 flex-1 basis-0 flex-col py-1 @7xl:col-start-2"
            :class="opponent ? 'justify-end @7xl:row-start-2' : 'justify-start @7xl:row-start-4'"
        >
            <div
                v-for="row in rows"
                :key="row.key"
                class="flex max-h-56 min-h-0 basis-0 items-stretch justify-center-safe gap-1.5 px-2 py-1.75"
                :style="{ flexGrow: row.groups.length ? row.grow : 0, flexShrink: 1 }"
            >
                <ReplayCardTile
                    v-for="(group, i) in row.groups"
                    :key="`${group.card.Id}-${group.count}`"
                    :card="group.card"
                    :count="group.count"
                    :opponent="opponent"
                    :pair="pairs.get(group.card.Id) ?? null"
                    :last="i === row.groups.length - 1"
                />
            </div>
        </div>
    </div>
</template>
