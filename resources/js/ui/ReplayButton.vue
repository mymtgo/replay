<script setup lang="ts">
import type { Component } from 'vue';
import { computed } from 'vue';
import { cn } from '../lib/cn';

const props = withDefaults(
    defineProps<{
        variant?: 'primary' | 'ghost';
        /** Renders a link through `as` when set, a button otherwise. */
        href?: string;
        as?: Component | string;
    }>(),
    { variant: 'primary', href: undefined, as: 'a' },
);

const base =
    "inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md px-3 text-sm font-medium tracking-tight whitespace-nowrap transition-all outline-none has-[>svg]:px-2.5 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.75] [&_svg:not([class*='size-'])]:size-[1em]";

const variants = {
    primary:
        'replay-bevel border border-[oklch(0.20_0.05_235)] bg-linear-to-b from-[oklch(0.48_0.12_235)] to-[oklch(0.43_0.11_235)] text-primary-foreground shadow-xs shadow-black/30 hover:from-[oklch(0.50_0.12_235)] hover:to-[oklch(0.45_0.11_235)]',
    ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
};

const classes = computed(() => cn(base, variants[props.variant]));
</script>

<template>
    <component :is="as" v-if="href" :href="href" :class="classes">
        <slot />
    </component>
    <button v-else type="button" :class="classes">
        <slot />
    </button>
</template>
