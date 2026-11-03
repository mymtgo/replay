<script setup lang="ts">
import { computed } from 'vue';
import ReplayCardBack from './ReplayCardBack.vue';
import ReplayCardImage from './ReplayCardImage.vue';
import { useReplayContext } from './replayContext';
import type { ReplayCard } from './types';

const props = defineProps<{
    hand: ReplayCard[];
    handCount: number;
    /** Their cards we know: revealed ones still in hand. */
    opponentHand: ReplayCard[];
    opponentCount: number;
    opponentName: string;
}>();

const { showPreview, hidePreview, pinPreview } = useReplayContext();

const hidden = computed(() => Math.max(0, props.opponentCount - props.opponentHand.length));

const sections = computed(() => [
    { key: 'you', title: 'Your hand', count: props.handCount, cards: props.hand, hidden: 0 },
    { key: 'opponent', title: `${props.opponentName}'s hand`, count: props.opponentCount, cards: props.opponentHand, hidden: hidden.value },
]);
</script>

<template>
    <div class="flex flex-col gap-3 pb-3">
        <section v-for="section in sections" :key="section.key" class="flex flex-col gap-1.5">
            <div class="flex items-baseline gap-1.5 px-4 text-[12px]">
                <span class="font-semibold">{{ section.title }}</span>
                <span class="text-muted-foreground tabular-nums">{{ section.count }}</span>
            </div>
            <div class="flex h-32 gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div
                    v-for="card in section.cards"
                    :key="card.Id"
                    class="relative aspect-[63/88] h-full flex-none rounded shadow-[0_1px_4px_rgba(0,0,0,.35)]"
                    @mouseenter="showPreview($event, card)"
                    @mouseleave="hidePreview"
                    @click="pinPreview($event, card)"
                >
                    <ReplayCardImage :name="card.name" :type="card.type" :image="card.image" show-type />
                </div>
                <div
                    v-for="n in section.hidden"
                    :key="`hidden-${n}`"
                    class="relative aspect-[63/88] h-full flex-none rounded shadow-[0_1px_4px_rgba(0,0,0,.35)]"
                >
                    <ReplayCardBack />
                </div>
                <span v-if="!section.cards.length && !section.hidden" class="self-center text-muted-foreground">No cards in hand</span>
            </div>
        </section>
    </div>
</template>
