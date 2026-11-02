<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue';
import type { Step } from '@mtgreplay/mtgr';
import type { ReplayTurn } from './types';
import { REPLAY_PHASES, REPLAY_STEP_ORDER, stepKey, stepLabel, type ReplayStepKey } from './replayPhases';

const props = defineProps<{
    turn: ReplayTurn | null;
    activeName: string | null;
    activeIsLocal: boolean;
    step: Step | null;
    /** Shown instead of the steps when there is no step: before the first turn. */
    missingText: string;
}>();

const current = computed(() => stepKey(props.step));
const currentIndex = computed(() => (current.value ? REPLAY_STEP_ORDER.indexOf(current.value) : -1));

function stepClass(key: ReplayStepKey): string {
    const index = REPLAY_STEP_ORDER.indexOf(key);

    if (index === currentIndex.value) {
        return 'replay-glow';
    }

    return index < currentIndex.value ? 'text-foreground' : 'text-muted-foreground';
}

const track = useTemplateRef<HTMLElement>('track');
const thumb = shallowRef<{ left: number; width: number } | null>(null);

/** The raised thumb slides under whichever step is current, like a switch. */
watch(
    [current, track],
    ([step, element]) => {
        const target = step ? element?.querySelector<HTMLElement>(`[data-step="${step}"]`) : null;
        thumb.value = target ? { left: target.offsetLeft, width: target.offsetWidth } : null;
    },
    { flush: 'post', immediate: true },
);
</script>

<template>
    <!-- The divider between the two areas: a band across the whole board, the phase bar centred in it. -->
    <div class="relative order-1 flex h-12 flex-none items-center justify-center border-y border-black/70 bg-black/45 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div class="replay-inset relative flex h-9 min-w-0 items-center gap-4 rounded-md px-3">
            <div v-if="turn?.number != null" class="flex flex-none items-center gap-2 whitespace-nowrap">
                <span class="size-2 rounded-full" :class="activeIsLocal ? 'bg-primary' : 'bg-(--replay-opponent)'" />
                <span v-if="activeName" class="text-sm font-bold">{{ activeName }}</span>
                <span v-if="activeName" aria-hidden="true" class="text-muted-foreground">·</span>
                <span class="text-sm font-bold">Turn {{ turn.playerTurn }}</span>
                <span class="text-xs text-muted-foreground" title="The file's turn number counts both players' turns">game turn {{ turn.number }}</span>
            </div>

            <template v-if="step">
                <div ref="track" class="relative flex flex-none items-center gap-1.5">
                    <div
                        v-if="thumb"
                        aria-hidden="true"
                        class="absolute top-0 left-0 h-6.5 rounded-md border border-black/60 bg-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_3px_rgba(0,0,0,0.6)] transition-[translate,width] duration-300 ease-out"
                        :style="{ translate: `${thumb.left}px 0`, width: `${thumb.width}px` }"
                    />
                    <template v-for="(group, g) in REPLAY_PHASES" :key="g">
                        <div v-if="g > 0" class="h-3.5 w-px bg-white/10" />
                        <div class="flex gap-0.5">
                            <div
                                v-for="item in group"
                                :key="item.key"
                                :data-step="item.key"
                                :title="item.label"
                                class="relative grid size-6.5 place-items-center rounded-md transition-colors duration-200"
                                :class="stepClass(item.key)"
                            >
                                <component :is="item.icon" :size="15" />
                            </div>
                        </div>
                    </template>
                </div>
                <span class="font-semibold whitespace-nowrap">{{ stepLabel(step) }}</span>
            </template>
            <span v-else class="truncate text-xs text-muted-foreground">{{ missingText }}</span>
        </div>
    </div>
</template>
