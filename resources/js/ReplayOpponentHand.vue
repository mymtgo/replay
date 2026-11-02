<script setup lang="ts">
import { computed } from 'vue';
import ReplayCardImage from './ReplayCardImage.vue';
import ReplayTargetMark from './ReplayTargetMark.vue';
import { useReplayContext } from './replayContext';
import type { ReplayCardView } from './types';

const props = defineProps<{
    /** Their hand cards whose faces are known: revealed, or seen by an effect like Thoughtseize. */
    known: ReplayCardView[];
    /** Hand size; the cards beyond the known ones show face down. */
    count: number;
}>();

const { showPreview, hidePreview, pinPreview, highlightedTargets } = useReplayContext();

const hidden = computed(() => Math.max(0, props.count - props.known.length));
</script>

<template>
    <!-- Opened from the count in their panel: known faces first, then backs for the rest. -->
    <div class="flex flex-wrap gap-1" role="group" :aria-label="`Their hand, ${count} cards, ${known.length} known`">
        <div
            v-for="card in known"
            :key="card.key"
            class="relative h-18 w-[calc(4.5rem*63/88)] rounded-[3px] shadow-[0_1px_4px_rgba(0,0,0,.5)] transition-transform hover:z-10 hover:-translate-y-0.5"
            :class="highlightedTargets.has(card.key) ? 'shadow-[0_0_0_2px_#fff,0_0_0_4px_#e5484d]!' : ''"
            @mouseenter="showPreview($event, card)"
            @mouseleave="hidePreview"
            @click="pinPreview($event, card)"
        >
            <ReplayCardImage :name="card.name" :image="card.image" />
            <ReplayTargetMark v-if="highlightedTargets.has(card.key)" variant="corner" />
        </div>
        <div v-for="n in hidden" :key="`back-${n}`" class="relative h-18 w-[calc(4.5rem*63/88)] rounded-[3px] shadow-[0_1px_4px_rgba(0,0,0,.5)]">
            <ReplayCardImage :name="null" />
        </div>
        <span v-if="!count" class="text-xs text-muted-foreground">No cards in hand</span>
    </div>
</template>
