<script setup lang="ts">
import { ChevronRight, RotateCcw, Trophy, X } from 'lucide-vue-next';
import { computed } from 'vue';
import { useReplayContext } from './replayContext';
import ReplayButton from './ui/ReplayButton.vue';
import ReplayPanel from './ui/ReplayPanel.vue';
import type { ReplayMatchGame } from './types';

/** Shown on the final frame: the game's result and a way on to the next game of the match. */
const props = defineProps<{
    game: ReplayMatchGame | null;
    next: ReplayMatchGame | null;
    won: boolean | null;
}>();

const emit = defineEmits<{
    restart: [];
    dismiss: [];
}>();

const { gameHref, linkComponent, selectGame } = useReplayContext();

const heading = computed(() => (props.game ? `Game ${props.game.number} complete` : 'Game complete'));

const result = computed(() => {
    if (props.won === null) {
        return { text: 'Result not recorded', class: 'text-muted-foreground' };
    }

    return props.won ? { text: 'You won', class: 'text-yellow-400' } : { text: 'You lost', class: 'text-[#e5484d]' };
});
</script>

<template>
    <div class="replay-texture-bg absolute top-1/2 left-1/2 z-40 w-80 -translate-1/2 rounded-md">
        <ReplayPanel class="gap-4 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            <div class="flex items-start justify-between gap-3">
                <div class="flex flex-col gap-1">
                    <span class="text-sm font-semibold">{{ heading }}</span>
                    <span class="flex items-center gap-1.5 text-[12.5px] font-semibold" :class="result.class">
                        <Trophy v-if="won" :size="14" />
                        {{ result.text }}
                    </span>
                </div>
                <button
                    type="button"
                    title="Dismiss"
                    class="grid size-6 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    @click="emit('dismiss')"
                >
                    <X :size="14" />
                </button>
            </div>

            <div class="flex items-center justify-end gap-2">
                <ReplayButton variant="ghost" @click="emit('restart')">
                    <RotateCcw />
                    Watch again
                </ReplayButton>
                <ReplayButton v-if="next && gameHref" :as="linkComponent" :href="gameHref(next.id)">
                    Watch game {{ next.number }}
                    <ChevronRight />
                </ReplayButton>
                <ReplayButton v-else-if="next && selectGame" @click="selectGame(next.id)">
                    Watch game {{ next.number }}
                    <ChevronRight />
                </ReplayButton>
            </div>
        </ReplayPanel>
    </div>
</template>
