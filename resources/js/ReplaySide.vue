<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import ReplayBattlefield from './ReplayBattlefield.vue';
import ReplayHand from './ReplayHand.vue';
import ReplayPlayerHud from './ReplayPlayerHud.vue';
import type { SideRows } from './replayRows';
import type { ReplayCardView, ReplayPlayerView, ReplayZone } from './types';

const props = defineProps<{
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
    /** An opponent's hand cards whose faces are known. */
    knownHand?: ReplayCardView[];
    /** Hand cards an effect is showing now, what is showing them, and the cards a spell on the stack chose. */
    revealed: ReadonlySet<string>;
    revealedBy: string | null;
    chosen: ReadonlySet<string>;
}>();

const emit = defineEmits<{
    toggleZone: [zone: ReplayZone, event: MouseEvent];
}>();

/**
 * Their hand hangs over the top of their area, not in its flow, so opening
 * it never resizes a card. It opens by itself while an effect is showing
 * cards from it; their count opens it by hand, and a reveal that begins
 * later opens it again.
 */
const manual = shallowRef<boolean | null>(null);
const showing = computed(() => props.opponent && [...props.revealed].some((key) => props.knownHand?.some((card) => card.key === key)));
const handOpen = computed(() => manual.value ?? showing.value);

watch(showing, () => {
    manual.value = null;
});
</script>

<template>
    <!--
        One player's half of the table, full width, tinted in their colour and
        ruled off at the centre line. The HUD is a bar above or below the board
        and, once the viewer is wide, a column beside it; the right column
        holds what is not a card (lasting effects, sharing).
    -->
    <section
        class="replay-area relative flex min-h-0 flex-1 basis-0 flex-col @7xl:grid @7xl:grid-cols-[15rem_minmax(0,1fr)_15rem] @7xl:grid-rows-[minmax(0,1fr)] @7xl:gap-x-2 @7xl:px-2"
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
                :hand-open="handOpen"
                @toggle-zone="(zone, event) => emit('toggleZone', zone, event)"
                @toggle-hand="manual = !handOpen"
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

        <ReplayHand v-if="opponent && handOpen" opponent :cards="knownHand ?? []" :count="player.handCount" :revealed="revealed" :revealed-by="revealedBy" :chosen="chosen" />

        <div class="order-3 hidden min-h-0 @7xl:col-start-3 @7xl:row-start-1 @7xl:flex @7xl:flex-col @7xl:py-2" :class="opponent ? 'justify-start' : 'justify-end'">
            <slot />
        </div>
    </section>
</template>
