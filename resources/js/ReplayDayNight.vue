<script setup lang="ts">
import { MoonStar, Sun } from 'lucide-vue-next';

defineProps<{
    /** The game's designation (CR 731): null until it first becomes day or night. */
    dayNight: 'day' | 'night';
    compact?: boolean;
}>();
</script>

<template>
    <span
        class="inline-flex flex-none items-center gap-1 rounded-full border px-1.5 font-semibold whitespace-nowrap"
        :class="[
            compact ? 'h-5 text-[11px]' : 'h-6 text-xs',
            dayNight === 'night' ? 'border-indigo-300/30 bg-indigo-400/15 text-indigo-200' : 'border-amber-300/30 bg-amber-400/15 text-amber-200',
        ]"
        :title="dayNight === 'night' ? 'It is night' : 'It is day'"
    >
        <component :is="dayNight === 'night' ? MoonStar : Sun" :size="compact ? 12 : 13" />
        {{ dayNight === 'night' ? 'Night' : 'Day' }}
    </span>
</template>
