<script setup lang="ts">
import { computed } from 'vue';
import { poolSymbols } from './replayCards';
import type { ReplayPlayerView } from './types';
import ManaSymbol from './ui/ManaSymbol.vue';

/** A player's floating mana, drawn against the centre line on their side of it. Nothing when the pool is empty. */
const props = defineProps<{
    player: ReplayPlayerView;
    compact?: boolean;
}>();

const pool = computed(() => poolSymbols(props.player.pool));
</script>

<template>
    <div
        v-if="pool.length"
        :title="`${player.name}'s mana pool`"
        class="replay-texture-bg pointer-events-auto inline-flex items-center gap-0.75 rounded-full border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        :class="compact ? 'h-6 px-1.5' : 'h-7.5 px-2'"
    >
        <ManaSymbol v-for="(symbol, i) in pool" :key="`${symbol}-${i}`" :symbol="symbol" :class="compact ? 'size-4' : 'size-5'" />
    </div>
</template>
