<script setup lang="ts">
import { Crosshair } from 'lucide-vue-next';
import ReplayCardImage from './ReplayCardImage.vue';
import { useReplayContext } from './replayContext';
import { REPLAY_ZONES } from './replayZones';
import type { ReplayCardView, ReplayZone } from './types';

/**
 * A zone's cards as a numbered list, most recent first. Names read at any
 * window size and the order is unmistakable; the full card is a hover or
 * tap away.
 */
defineProps<{
    zone: ReplayZone;
    cards: ReplayCardView[];
    /** Optional note beside each card, keyed by card key. */
    captions?: Map<string, string> | null;
    /** Taller rows for fingers on phones. */
    small?: boolean;
}>();

const { showPreview, hidePreview, pinPreview, highlightedTargets } = useReplayContext();
</script>

<template>
    <div v-if="!cards.length" class="px-3 py-4.5 text-center text-muted-foreground">
        {{ REPLAY_ZONES[zone].empty }}
    </div>
    <ol v-else class="flex min-h-0 flex-1 flex-col divide-y divide-white/6 overflow-y-auto">
        <li
            v-for="(card, i) in cards"
            :key="card.key"
            class="flex cursor-default items-center gap-2.5 px-3 hover:bg-accent/50"
            :class="[small ? 'py-1.5' : 'py-1', highlightedTargets.has(card.key) ? 'bg-[#e5484d]/20' : '']"
            @mouseenter="showPreview($event, card)"
            @mouseleave="hidePreview"
            @click="pinPreview($event, card)"
        >
            <span class="w-4 flex-none text-right text-[11px] text-muted-foreground tabular-nums">{{ i + 1 }}</span>
            <div class="relative aspect-[63/88] w-7 flex-none overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,.5)]">
                <ReplayCardImage :name="card.name ?? ''" :unknown="card.nameUnknown" :image="card.image" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col leading-tight">
                <span class="flex items-center gap-1 font-medium">
                    <Crosshair v-if="highlightedTargets.has(card.key)" :size="12" class="flex-none text-[#e5484d]" />
                    <span class="truncate">{{ card.name ?? 'Unknown card' }}</span>
                </span>
                <span v-if="captions?.get(card.key)" class="truncate text-[11px] text-muted-foreground">{{ captions.get(card.key) }}</span>
            </div>
        </li>
    </ol>
</template>
