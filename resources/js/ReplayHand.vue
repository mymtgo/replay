<script setup lang="ts">
import { computed } from 'vue';
import ReplayCardImage from './ReplayCardImage.vue';
import ReplayTargetMark from './ReplayTargetMark.vue';
import { HAND_SCALE } from './replayBoardFit';
import { useReplayContext } from './replayContext';
import type { ReplayCardView } from './types';

const props = defineProps<{
    /** Your hand's cards; a card nobody knows would show face down. */
    cards: ReplayCardView[];
    /** Hand size; anything beyond the known cards shows face down. */
    count: number;
}>();

const { showPreview, hidePreview, pinPreview, highlightedTargets } = useReplayContext();

const hidden = computed(() => Math.max(0, props.count - props.cards.length));
const slots = computed(() => props.cards.length + hidden.value);
</script>

<template>
    <!--
        Docked along the bottom edge of the viewer, under your area, so it reads
        as what you hold rather than as part of the battlefield. A crowded hand
        overlaps its cards instead of wrapping.
    -->
    <div
        data-replay-hand
        :data-weight="HAND_SCALE"
        :style="{ '--replay-hand-h': `calc(var(--replay-card-h) * ${HAND_SCALE})` }"
        class="relative order-3 flex flex-none items-center justify-center border-t border-black/70 bg-black/55 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        role="group"
        :aria-label="`Hand, ${count} ${count === 1 ? 'card' : 'cards'}`"
    >
        <span class="absolute top-2 left-4 text-[11px] text-muted-foreground">Your hand <span class="text-foreground tabular-nums">{{ count }}</span></span>

        <div class="flex h-(--replay-hand-h) min-w-0 max-w-full items-center justify-center gap-1.5">
            <span v-if="!slots" class="text-xs text-muted-foreground">No cards in hand</span>
            <div
                v-for="(card, i) in cards"
                :key="card.key"
                class="relative h-full w-[calc(var(--replay-hand-h)*63/88)] min-w-[18px] transition-transform duration-150 hover:z-20 hover:-translate-y-1.5"
                :style="{ flex: `0 ${i === slots - 1 ? 0 : 1} auto` }"
                @mouseenter="showPreview($event, card)"
                @mouseleave="hidePreview"
                @click="pinPreview($event, card)"
            >
                <div
                    class="absolute top-0 left-0 h-full w-[calc(var(--replay-hand-h)*63/88)] rounded-[4px] shadow-[0_1px_4px_rgba(0,0,0,.45)]"
                    :class="highlightedTargets.has(card.key) ? 'z-10 shadow-[0_0_0_2px_#fff,0_0_0_5px_#e5484d,0_0_16px_6px_rgba(229,72,77,.7)]!' : ''"
                >
                    <ReplayCardImage :name="card.name" :image="card.image" />
                    <ReplayTargetMark v-if="highlightedTargets.has(card.key)" variant="card" />
                </div>
            </div>
            <div
                v-for="n in hidden"
                :key="`hidden-${n}`"
                class="relative h-full w-[calc(var(--replay-hand-h)*63/88)] min-w-[18px]"
                :style="{ flex: `0 ${cards.length + n === slots ? 0 : 1} auto` }"
            >
                <div class="absolute top-0 left-0 h-full w-[calc(var(--replay-hand-h)*63/88)] rounded-[4px] shadow-[0_1px_4px_rgba(0,0,0,.45)]">
                    <ReplayCardImage :name="null" />
                </div>
            </div>
        </div>
    </div>
</template>
