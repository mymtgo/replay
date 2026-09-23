<script setup lang="ts">
import { computed } from 'vue';
import ReplayCardBack from './ReplayCardBack.vue';
import ReplayCardImage from './ReplayCardImage.vue';
import { useReplayContext } from './replayContext';
import type { ReplayCard } from './types';

const props = defineProps<{
    /** The cards in this hand we can see: all of yours, only revealed ones of theirs. */
    cards: ReplayCard[];
    /** Hand size; anything beyond the known cards shows face down. */
    count: number;
    opponent: boolean;
}>();

const { showPreview, hidePreview } = useReplayContext();

const hidden = computed(() => Math.max(0, props.count - props.cards.length));
const slots = computed(() => props.cards.length + hidden.value);
</script>

<template>
    <!--
        Yours sits below the board and theirs above it, mirrored. Once the viewer
        is wide, each tucks against its own lands and is only as wide as its cards.
    -->
    <div
        class="flex-none px-2"
        :class="
            opponent
                ? '-order-1 pt-2 @7xl:col-start-2 @7xl:row-start-1 @7xl:px-0'
                : 'order-3 pb-2 @7xl:col-start-2 @7xl:row-start-5 @7xl:px-0'
        "
    >
        <div
            class="replay-inset box-border flex items-center gap-2.5 rounded-md px-3 py-2 @7xl:mx-auto @7xl:w-fit @7xl:max-w-full @7xl:min-w-72"
            :class="opponent ? 'h-20' : 'h-25'"
        >
            <div class="w-8.5 flex-none text-[11px] leading-tight text-muted-foreground">Hand<br />{{ count }}</div>
            <div class="flex h-full min-w-0 flex-1 gap-1">
                <div
                    v-for="(card, i) in cards"
                    :key="card.Id"
                    class="relative aspect-[63/88] h-full min-w-[18px] transition-transform duration-150 hover:z-20 hover:-translate-y-1"
                    :style="{ flex: `0 ${i === slots - 1 ? 0 : 1} auto` }"
                    @mouseenter="showPreview($event, card)"
                    @mouseleave="hidePreview"
                >
                    <div class="absolute top-0 left-0 aspect-[63/88] h-full rounded shadow-[0_1px_4px_rgba(0,0,0,.35)]">
                        <ReplayCardImage :name="card.name" :image="card.image" />
                    </div>
                </div>
                <div
                    v-for="n in hidden"
                    :key="`hidden-${n}`"
                    class="relative aspect-[63/88] h-full min-w-[18px]"
                    :style="{ flex: `0 ${cards.length + n === slots ? 0 : 1} auto` }"
                >
                    <div class="absolute top-0 left-0 aspect-[63/88] h-full rounded shadow-[0_1px_4px_rgba(0,0,0,.35)]">
                        <ReplayCardBack />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
