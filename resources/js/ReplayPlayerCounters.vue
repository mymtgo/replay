<script setup lang="ts">
import { CircleDot, Radiation, Star } from 'lucide-vue-next';
import { computed, type Component } from 'vue';
import { playerCounters } from './replayPlayerCounters';
import type { ReplayPlayerView } from './types';
import EnergyIcon from './ui/EnergyIcon.vue';
import PoisonIcon from './ui/PoisonIcon.vue';
import TicketIcon from './ui/TicketIcon.vue';

const props = defineProps<{
    player: ReplayPlayerView;
    /** Icon size in pixels. */
    size: number;
}>();

/** Icon and colour per counter kind; a kind not listed gets the generic mark and its name in the tooltip. */
const STYLES: Record<string, { icon: Component; colour: string }> = {
    poison: { icon: PoisonIcon, colour: 'text-[#4fb883]' },
    energy: { icon: EnergyIcon, colour: 'text-[#f5c542]' },
    experience: { icon: Star, colour: 'text-[#c9a7ff]' },
    rad: { icon: Radiation, colour: 'text-[#9be15d]' },
    ticket: { icon: TicketIcon, colour: 'text-[#ff9f5a]' },
};
const OTHER = { icon: CircleDot, colour: 'text-muted-foreground' };

const counters = computed(() => playerCounters(props.player).map((counter) => ({ ...counter, ...(STYLES[counter.kind] ?? OTHER) })));
</script>

<template>
    <span v-for="counter in counters" :key="counter.kind" :title="counter.label" class="flex flex-none items-center gap-1" :class="counter.colour">
        <component :is="counter.icon" :size="size" />
        <span class="min-w-[2ch] font-bold tabular-nums">{{ counter.count }}</span>
    </span>
</template>
