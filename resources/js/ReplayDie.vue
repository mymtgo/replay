<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    /** 1 to 6. */
    face: number;
}>();

const tl = [6.5, 6.5];
const tr = [17.5, 6.5];
const ml = [6.5, 12];
const mm = [12, 12];
const mr = [17.5, 12];
const bl = [6.5, 17.5];
const br = [17.5, 17.5];

/** Pip positions on a 24-unit face, laid out the way a real d6 reads. */
const layouts: Record<number, number[][]> = {
    1: [mm],
    2: [tr, bl],
    3: [tr, mm, bl],
    4: [tl, tr, bl, br],
    5: [tl, tr, mm, bl, br],
    6: [tl, tr, ml, mr, bl, br],
};

const pips = computed(() => layouts[props.face] ?? []);
</script>

<template>
    <svg viewBox="0 0 24 24" class="block size-3.5 drop-shadow-[0_1px_1.5px_rgba(0,0,0,.55)]" aria-hidden="true">
        <rect x="1" y="1" width="22" height="22" rx="4.5" fill="#fff" stroke="#111" stroke-width="1.5" />
        <circle v-for="([cx, cy], i) in pips" :key="i" :cx="cx" :cy="cy" r="2.6" fill="#111" />
    </svg>
</template>
