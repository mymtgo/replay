<script setup lang="ts">
import { Layers } from 'lucide-vue-next';
import ReplayDayNight from './ReplayDayNight.vue';
import ReplayManaPool from './ReplayManaPool.vue';
import ReplayResultPill from './ReplayResultPill.vue';
import type { ReplayPlayerView, ReplayResult, ReplayTurn } from './types';

defineProps<{
    turn: ReplayTurn | null;
    activeName: string | null;
    activeIsLocal: boolean;
    /** Current step's name; null when the game has no phase data or the step is unknown. */
    stepLabel: string | null;
    /** Shown instead when the turn itself is unknown or unrecorded. */
    missingText: string;
    stackCount: number;
    /** Set on the final moment when the file records who won. */
    result: ReplayResult | null;
    /** Each side's floating mana sits against the line on that side. */
    opponentPlayer: ReplayPlayerView | null;
    localPlayer: ReplayPlayerView | null;
    dayNight: 'day' | 'night' | null;
}>();

const emit = defineEmits<{
    openStack: [];
}>();
</script>

<template>
    <!-- The phase rail's step icons do not fit a phone, so the centre line carries a one-line summary. -->
    <div class="relative flex h-8 flex-none items-center justify-center px-2">
        <div aria-hidden="true" class="absolute inset-x-0 top-1/2 -translate-y-px border-t border-b border-t-black border-b-white/5" />

        <div class="replay-texture-bg relative min-w-0 rounded-md">
            <div class="replay-inset flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] whitespace-nowrap">
                <template v-if="turn?.number != null">
                    <span v-if="activeName" class="flex min-w-0 items-center gap-1">
                        <span class="size-1.5 flex-none rounded-full" :class="activeIsLocal ? 'bg-primary' : 'bg-(--replay-opponent)'" />
                        <span class="max-w-28 truncate">{{ activeName }}</span>
                    </span>
                    <span class="font-bold">T{{ turn.playerTurn }}</span>
                    <template v-if="stepLabel">
                        <span class="text-muted-foreground">·</span>
                        <span class="font-semibold">{{ stepLabel }}</span>
                    </template>
                    <ReplayDayNight v-if="dayNight" :day-night="dayNight" compact />
                </template>
                <span v-else class="truncate text-muted-foreground">{{ missingText }}</span>
            </div>
        </div>

        <button
            v-if="stackCount"
            type="button"
            title="Stack"
            class="replay-texture-bg absolute top-1/2 left-2 z-10 inline-flex h-7 -translate-y-1/2 cursor-pointer items-center gap-1 rounded-md border border-primary/60 px-2 text-[12px] font-semibold shadow-[0_2px_8px_rgba(0,0,0,.4)]"
            @click="emit('openStack')"
        >
            <Layers :size="13" class="replay-glow" />
            <span class="tabular-nums">{{ stackCount }}</span>
        </button>

        <ReplayManaPool v-if="opponentPlayer" :player="opponentPlayer" compact class="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2" />
        <ReplayManaPool v-if="localPlayer" :player="localPlayer" compact class="absolute top-full left-1/2 z-10 mt-1 -translate-x-1/2" />

        <ReplayResultPill v-if="result" :result="result" class="absolute top-1/2 right-2 z-10 -translate-y-1/2" />
    </div>
</template>
