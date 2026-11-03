<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue';
import { phaseMissingText, REPLAY_PHASES, REPLAY_STEP_ORDER, stepLabel, type ReplayStepKey } from './replayPhases';

const props = defineProps<{
    turnNumber: number | null;
    activeName: string | null;
    activeIsLocal: boolean;
    step: ReplayStepKey | null;
    /** Whether any frame in this game carries phase data (sidecar games do, older games do not). */
    phasesRecorded: boolean;
}>();

const missingText = computed(() => phaseMissingText(props.phasesRecorded, props.turnNumber));

const currentIndex = computed(() => (props.step ? REPLAY_STEP_ORDER.indexOf(props.step) : -1));

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
    [() => props.step, track],
    ([step, element]) => {
        const target = step ? element?.querySelector<HTMLElement>(`[data-step="${step}"]`) : null;
        thumb.value = target ? { left: target.offsetLeft, width: target.offsetWidth } : null;
    },
    { flush: 'post', immediate: true },
);
</script>

<template>
    <div class="relative order-1 flex h-12 flex-none items-center justify-center px-2 @7xl:col-span-3 @7xl:row-start-3 @7xl:-mx-2">
        <!-- The line between the two halves of the board; the rail straddles it. -->
        <div aria-hidden="true" class="absolute inset-x-0 top-1/2 -translate-y-px border-t border-b border-t-black border-b-white/5" />

        <!-- Opaque so the dividing line stops at the rail's edges. -->
        <div class="replay-texture-bg relative min-w-0 rounded-md">
            <div class="replay-inset flex h-9 min-w-0 items-center gap-4 rounded-md px-3">
                <div v-if="turnNumber !== null" class="flex flex-none items-center gap-2 whitespace-nowrap">
                    <span class="text-sm font-bold">Turn {{ turnNumber }}</span>
                    <span v-if="activeName" class="flex items-center gap-1.5">
                        <span class="size-1.75 rounded-full" :class="activeIsLocal ? 'bg-primary' : 'bg-muted-foreground'" />
                        <span>{{ activeName }}</span>
                    </span>
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

        <!-- Floats over the board's left edge, its middle on the centre line. -->
        <div v-if="$slots.default" class="absolute top-1/2 left-2 z-30 flex max-h-80 -translate-y-1/2">
            <slot />
        </div>
    </div>
</template>
