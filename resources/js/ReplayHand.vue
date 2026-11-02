<script setup lang="ts">
import { Eye } from 'lucide-vue-next';
import { computed } from 'vue';
import ReplayCardImage from './ReplayCardImage.vue';
import ReplayTargetMark from './ReplayTargetMark.vue';
import { HAND_SCALE } from './replayBoardFit';
import { useReplayContext } from './replayContext';
import type { ReplayCardView } from './types';

const props = defineProps<{
    /** The cards of this hand whose faces are known: all of yours, the revealed or identified ones of theirs. */
    cards: ReplayCardView[];
    /** Hand size; anything beyond the known cards shows face down. */
    count: number;
    /** Theirs hangs from the top edge as an overlay, so opening it never moves the board; yours is docked along the bottom. */
    opponent?: boolean;
    /** Cards an effect is showing right now, and what is showing them. */
    revealed: ReadonlySet<string>;
    revealedBy: string | null;
    /** Cards a spell on the stack chose. */
    chosen: ReadonlySet<string>;
}>();

const { showPreview, hidePreview, pinPreview, highlightedTargets } = useReplayContext();

const hidden = computed(() => Math.max(0, props.count - props.cards.length));
const slots = computed(() => props.cards.length + hidden.value);
const shown = computed(() => props.cards.some((card) => props.revealed.has(card.key)));
const known = computed(() => props.cards.length);
</script>

<template>
    <div
        v-bind="opponent ? {} : { 'data-replay-hand': '', 'data-weight': HAND_SCALE }"
        :style="{ '--replay-hand-h': `calc(var(--replay-card-h) * ${HAND_SCALE})` }"
        class="flex items-center justify-center bg-black/70 px-4 py-2"
        :class="
            opponent
                ? 'absolute top-14 right-0 left-0 z-30 border-b border-black/70 shadow-[0_12px_30px_rgba(0,0,0,0.5)] @7xl:top-0 @7xl:right-62 @7xl:left-62'
                : 'relative order-3 flex-none border-t border-black/70 bg-black/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
        "
        role="group"
        :aria-label="`${opponent ? 'Their' : 'Your'} hand, ${count} ${count === 1 ? 'card' : 'cards'}`"
    >
        <span class="absolute top-2 left-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {{ opponent ? 'Their hand' : 'Your hand' }} <span class="text-foreground tabular-nums">{{ count }}</span>
            <span v-if="opponent && known" class="tabular-nums">({{ known }} known)</span>
            <span v-if="shown && revealedBy" class="ml-1 flex items-center gap-1 text-foreground"><Eye :size="12" /> Revealed by {{ revealedBy }}</span>
        </span>

        <div class="flex h-(--replay-hand-h) max-w-full min-w-0 items-center justify-center gap-1.5">
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
                    :class="[
                        highlightedTargets.has(card.key) ? 'z-10 shadow-[0_0_0_2px_#fff,0_0_0_5px_#e5484d,0_0_16px_6px_rgba(229,72,77,.7)]!' : '',
                        chosen.has(card.key) ? 'z-10 shadow-[0_0_0_2px_#fff,0_0_0_4px_#f5a524,0_0_14px_4px_rgba(245,165,36,.55)]!' : revealed.has(card.key) ? 'shadow-[0_0_0_2px_#38bdf8]!' : '',
                    ]"
                >
                    <ReplayCardImage :name="card.name" :image="card.image" />
                    <ReplayTargetMark v-if="highlightedTargets.has(card.key)" variant="card" />
                    <span
                        v-if="chosen.has(card.key) || revealed.has(card.key)"
                        class="absolute right-0 bottom-0 left-0 rounded-b-[4px] px-1 py-px text-center text-[10px] font-bold"
                        :class="chosen.has(card.key) ? 'bg-[#f5a524] text-[#1a1a1a]' : 'bg-[#38bdf8] text-[#06222f]'"
                    >
                        {{ chosen.has(card.key) ? 'Chosen' : 'Revealed' }}
                    </span>
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
