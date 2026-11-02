<script setup lang="ts">
import { computed } from 'vue';
import ReplayCardImage from './ReplayCardImage.vue';
import ReplayTargetMark from './ReplayTargetMark.vue';
import { OPPONENT_HAND_SCALE } from './replayBoardFit';
import { useReplayContext } from './replayContext';
import type { ReplayCardView } from './types';

const props = defineProps<{
    /** The cards in this hand we can see: all of yours, only revealed ones of theirs. */
    cards: ReplayCardView[];
    /** Hand size; anything beyond the known cards shows face down. */
    count: number;
    opponent: boolean;
}>();

const { showPreview, hidePreview, pinPreview, highlightedTargets } = useReplayContext();

const hidden = computed(() => Math.max(0, props.count - props.cards.length));
/** An opponent's hand is mostly card backs, so it takes less of the board's height than yours. */
const weight = computed(() => (props.opponent ? OPPONENT_HAND_SCALE : 1));
const slots = computed(() => props.cards.length + hidden.value);
</script>

<template>
    <!--
        Yours sits below the board and theirs above it, mirrored. Once the viewer
        is wide, each tucks against its own lands and is only as wide as its cards.
    -->
    <div
        data-replay-hand
        :data-weight="weight"
        :style="{ '--replay-hand-h': `calc(var(--replay-card-h) * ${weight})` }"
        class="flex-none px-2"
        :class="
            opponent
                ? '-order-1 pt-2 @7xl:col-start-2 @7xl:row-start-1 @7xl:px-0'
                : 'order-3 pb-2 @7xl:col-start-2 @7xl:row-start-5 @7xl:px-0'
        "
    >
        <div
            class="replay-inset box-border flex items-center gap-2.5 rounded-md px-3 py-2 @7xl:mx-auto @7xl:w-fit @7xl:max-w-full @7xl:min-w-72"
            role="group"
            :aria-label="`Hand, ${count} ${count === 1 ? 'card' : 'cards'}`"
        >
            <div class="flex h-(--replay-hand-h) min-w-0 flex-1 gap-1">
                <div
                    v-for="(card, i) in cards"
                    :key="card.key"
                    class="relative h-full w-[calc(var(--replay-hand-h)*63/88)] min-w-[18px] transition-transform duration-150 hover:z-20 hover:-translate-y-1"
                    :style="{ flex: `0 ${i === slots - 1 ? 0 : 1} auto` }"
                    @mouseenter="showPreview($event, card)"
                    @mouseleave="hidePreview"
                    @click="pinPreview($event, card)"
                >
                    <div
                        class="absolute top-0 left-0 h-full w-[calc(var(--replay-hand-h)*63/88)] rounded shadow-[0_1px_4px_rgba(0,0,0,.35)]"
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
                    <div class="absolute top-0 left-0 h-full w-[calc(var(--replay-hand-h)*63/88)] rounded shadow-[0_1px_4px_rgba(0,0,0,.35)]">
                        <ReplayCardImage :name="null" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
