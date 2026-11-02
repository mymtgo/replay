<script setup lang="ts">
import { Crosshair } from 'lucide-vue-next';

/**
 * The target icon: a small badge on the corner. On a card it sits just
 * inside the top right corner, sized from the card height; on a button it
 * overhangs the corner, and inside a panel that clips its edge it sits just
 * within the corner.
 */
defineProps<{
    variant: 'card' | 'corner' | 'inset';
}>();
</script>

<template>
    <span
        data-replay-target
        title="Target"
        class="pointer-events-none absolute z-10 grid place-items-center rounded-full bg-[#e5484d] text-white shadow-[0_1px_3px_rgba(0,0,0,.5)]"
        :class="variant === 'card' ? 'top-1 right-1' : variant === 'inset' ? 'top-1.5 right-1.5 size-4.5' : '-top-1.5 -right-1.5 size-4.5'"
        :style="variant === 'card' ? { width: 'max(16px, calc(var(--replay-card-h) * 0.13))', aspectRatio: '1' } : undefined"
    >
        <Crosshair :class="variant === 'card' ? 'size-3/4' : 'size-3'" :stroke-width="2.5" />
    </span>
</template>
