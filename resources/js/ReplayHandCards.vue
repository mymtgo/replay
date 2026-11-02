<script setup lang="ts">
import { Eye } from 'lucide-vue-next';
import { computed } from 'vue';
import ReplayCardImage from './ReplayCardImage.vue';
import ReplayTargetMark from './ReplayTargetMark.vue';
import { useReplayContext } from './replayContext';
import type { ReplayCardView } from './types';

const props = defineProps<{
    /** The cards of this hand whose faces are known: all of yours, the revealed or identified ones of theirs. */
    cards: ReplayCardView[];
    /** Hand size; the cards beyond the known ones show face down. */
    count: number;
    /** Cards an effect is showing right now, and what is showing them. */
    revealed: ReadonlySet<string>;
    revealedBy: string | null;
    /** Cards a spell on the stack chose. */
    chosen: ReadonlySet<string>;
}>();

const { showPreview, hidePreview, pinPreview, highlightedTargets } = useReplayContext();

const hidden = computed(() => Math.max(0, props.count - props.cards.length));
const shown = computed(() => props.cards.some((card) => props.revealed.has(card.key)));
</script>

<template>
    <div v-if="!count" class="px-3 py-4.5 text-center text-muted-foreground">No cards in hand</div>
    <div v-else class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5">
        <span v-if="shown && revealedBy" class="flex items-center gap-1.5 text-[11.5px]"><Eye :size="13" class="text-[#38bdf8]" /> Revealed by {{ revealedBy }}</span>

        <!-- Cards size to the window's width, a few across, and wrap. -->
        <div class="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
            <div
                v-for="card in cards"
                :key="card.key"
                class="relative aspect-[63/88] rounded-[4px] shadow-[0_1px_4px_rgba(0,0,0,.5)] transition-transform hover:z-10 hover:-translate-y-0.5"
                :class="[
                    highlightedTargets.has(card.key) ? 'z-10 shadow-[0_0_0_2px_#fff,0_0_0_4px_#e5484d,0_0_12px_4px_rgba(229,72,77,.6)]!' : '',
                    chosen.has(card.key) ? 'shadow-[0_0_0_2px_#f5a524]!' : '',
                ]"
                @mouseenter="showPreview($event, card)"
                @mouseleave="hidePreview"
                @click="pinPreview($event, card)"
            >
                <ReplayCardImage :name="card.name" :image="card.image" />
                <ReplayTargetMark v-if="highlightedTargets.has(card.key)" variant="corner" />
                <span v-if="chosen.has(card.key)" class="absolute top-1 right-1 rounded-full bg-[#f5a524] px-1.5 py-px text-[10px] font-bold text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,.5)]">Chosen</span>
            </div>
            <div v-for="n in hidden" :key="`back-${n}`" class="relative aspect-[63/88] rounded-[4px] shadow-[0_1px_4px_rgba(0,0,0,.5)]">
                <ReplayCardImage :name="null" />
            </div>
        </div>
    </div>
</template>
