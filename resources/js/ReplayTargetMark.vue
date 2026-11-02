<script setup lang="ts">
import { Crosshair } from 'lucide-vue-next';

/**
 * The target icon. On a card it sits at the centre, sized from the card
 * height; on a button it is a small badge on the corner, and inside a panel
 * that clips its edge it sits just within the corner.
 */
defineProps<{
    variant: 'card' | 'corner' | 'inset';
}>();
</script>

<template>
    <span
        data-replay-target
        title="Target"
        class="pointer-events-none absolute z-10 grid place-items-center rounded-full bg-[#e5484d] text-white shadow-[0_1px_6px_rgba(0,0,0,.6)] ring-2 ring-white"
        :class="variant === 'card' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : variant === 'inset' ? 'top-1.5 right-1.5 size-4.5' : '-top-1.5 -right-1.5 size-4.5'"
        :style="variant === 'card' ? { width: 'max(22px, calc(var(--replay-card-h) * 0.3))', aspectRatio: '1' } : undefined"
    >
        <Crosshair :class="variant === 'card' ? 'size-3/5' : 'size-3'" :stroke-width="2.5" />
    </span>
</template>
