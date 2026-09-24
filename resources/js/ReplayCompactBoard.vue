<script setup lang="ts">
import { computed } from 'vue';
import ReplayBattlefield from './ReplayBattlefield.vue';
import ReplayCompactHud from './ReplayCompactHud.vue';
import ReplayCompactPhase from './ReplayCompactPhase.vue';
import type { ReplayLayout } from './replayLayout';
import type { ReplayZone } from './types';
import type { ReplaySideView } from './useReplayBoard';

const props = defineProps<{
    /** Opponent first, then you. */
    sides: ReplaySideView[];
    layout: Exclude<ReplayLayout, 'regular'>;
    clocks: Map<number, number>;
    winnerId: number | null;
    pairs: Map<number, number>;
    turnNumber: number | null;
    activeName: string | null;
    activeIsLocal: boolean;
    stepLabel: string | null;
    missingText: string;
    stackCount: number;
}>();

const emit = defineEmits<{
    openZone: [player: number, zone: ReplayZone, event: MouseEvent];
    openStack: [];
}>();

const landscape = computed(() => props.layout === 'compact-landscape');
const opponentSide = computed(() => props.sides.find((side) => side.opponent) ?? null);
const localSide = computed(() => props.sides.find((side) => !side.opponent) ?? null);
</script>

<template>
    <!--
        Portrait stacks HUD, board, centre line, board, HUD. Landscape moves both
        HUDs into a narrow rail so the board keeps the little height there is.
    -->
    <div class="flex min-h-0 min-w-0 flex-1 gap-1.5 px-1.5 pt-1.5" :class="landscape ? 'flex-row' : 'flex-col'">
        <div v-if="landscape" class="flex w-37.5 flex-none flex-col justify-between gap-1.5 overflow-y-auto pb-1.5">
            <template v-for="side in [opponentSide, localSide]" :key="side?.player.Id">
                <ReplayCompactHud
                    v-if="side"
                    :player="side.player"
                    :opponent="side.opponent"
                    :active="side.active"
                    :priority="side.priority"
                    :time-left="clocks.get(side.player.Id) ?? null"
                    :winner="side.player.Id === winnerId"
                    :zone-counts="side.zoneCounts"
                    stacked
                    @open-zone="(zone, event) => emit('openZone', side.player.Id, zone, event)"
                />
            </template>
        </div>

        <div class="flex min-h-0 min-w-0 flex-1 flex-col">
            <ReplayCompactHud
                v-if="!landscape && opponentSide"
                :player="opponentSide.player"
                :opponent="true"
                :active="opponentSide.active"
                :priority="opponentSide.priority"
                :time-left="clocks.get(opponentSide.player.Id) ?? null"
                :winner="opponentSide.player.Id === winnerId"
                :zone-counts="opponentSide.zoneCounts"
                :stacked="false"
                @open-zone="(zone, event) => emit('openZone', opponentSide!.player.Id, zone, event)"
            />

            <ReplayBattlefield
                v-if="opponentSide"
                :battlefield="opponentSide.battlefield"
                :opponent="true"
                :pairs="pairs"
                scroll
                :single-row="landscape"
            />

            <ReplayCompactPhase
                :turn-number="turnNumber"
                :active-name="activeName"
                :active-is-local="activeIsLocal"
                :step-label="stepLabel"
                :missing-text="missingText"
                :stack-count="stackCount"
                @open-stack="emit('openStack')"
            />

            <ReplayBattlefield
                v-if="localSide"
                :battlefield="localSide.battlefield"
                :opponent="false"
                :pairs="pairs"
                scroll
                :single-row="landscape"
            />

            <ReplayCompactHud
                v-if="!landscape && localSide"
                :player="localSide.player"
                :opponent="false"
                :active="localSide.active"
                :priority="localSide.priority"
                :time-left="clocks.get(localSide.player.Id) ?? null"
                :winner="localSide.player.Id === winnerId"
                :zone-counts="localSide.zoneCounts"
                :stacked="false"
                class="mb-1.5"
                @open-zone="(zone, event) => emit('openZone', localSide!.player.Id, zone, event)"
            />
        </div>
    </div>
</template>
