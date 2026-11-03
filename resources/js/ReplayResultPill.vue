<script setup lang="ts">
import type { ReplayResult } from './types';

/** The game's result for the local player, on the centre line once the replay reaches the end. */
defineProps<{ result: ReplayResult }>();
</script>

<template>
    <span
        class="inline-flex h-6 flex-none items-center rounded-full px-2.5 text-[11px] font-black tracking-[0.14em] ring-1"
        :class="result === 'win' ? 'bg-(--replay-win)/15 text-(--replay-win) ring-(--replay-win)/50' : 'bg-(--replay-loss)/15 text-(--replay-loss) ring-(--replay-loss)/50'"
    >
        {{ result === 'win' ? 'WIN' : 'LOSS' }}
    </span>
</template>
