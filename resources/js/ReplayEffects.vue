<script setup lang="ts">
import { Award, Sparkles } from 'lucide-vue-next';
import ReplayPanel from './ui/ReplayPanel.vue';
import type { ReplayEffectView } from './types';

/** Lasting effects and emblems in play, in the right column on wide viewers. */
defineProps<{
    effects: ReplayEffectView[];
}>();
</script>

<template>
    <div class="min-h-0">
        <ReplayPanel class="max-h-full w-60 gap-2 overflow-y-auto px-3 py-2.5">
            <div class="flex items-baseline gap-1.5 text-[11px] leading-tight">
                <span class="font-semibold">Effects</span>
                <span class="text-muted-foreground tabular-nums">{{ effects.length }}</span>
            </div>
            <ul class="flex flex-col gap-1.5">
                <li v-for="effect in effects" :key="effect.key" class="flex gap-1.5 text-[11px] leading-snug">
                    <component :is="effect.kind === 'emblem' ? Award : Sparkles" :size="12" class="mt-0.5 flex-none text-muted-foreground" />
                    <div class="flex min-w-0 flex-col">
                        <span class="truncate font-semibold">{{ effect.sourceName ?? (effect.kind === 'emblem' ? 'Emblem' : 'Effect') }}</span>
                        <span class="text-foreground/80">{{ effect.text ?? 'No text recorded' }}</span>
                        <span class="text-muted-foreground">{{ effect.controller }}</span>
                    </div>
                </li>
            </ul>
        </ReplayPanel>
    </div>
</template>
