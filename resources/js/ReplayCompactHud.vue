<script setup lang="ts">
import { Hand, Heart, Layers, Timer, Trophy } from 'lucide-vue-next';
import { computed } from 'vue';
import { hudZones } from './replayZones';
import type { ReplayPlayer, ReplayZone } from './types';

const LOW_CLOCK_MS = 5 * 60 * 1000;

const props = defineProps<{
    player: ReplayPlayer;
    opponent: boolean;
    active: boolean;
    priority: boolean;
    timeLeft: number | null;
    winner: boolean;
    zoneCounts: Record<ReplayZone, number>;
    /** Offer the sideboard; only yours, and only when the game recorded one. */
    sideboard: boolean;
    /** Landscape phones stack the HUD in a narrow rail beside the board. */
    stacked: boolean;
}>();

const emit = defineEmits<{
    openZone: [zone: ReplayZone, event: MouseEvent];
}>();

const clock = computed(() => {
    if (props.timeLeft == null) {
        return null;
    }

    const seconds = Math.max(0, Math.round(props.timeLeft / 1000));

    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
});

const zones = computed(() => hudZones(props.opponent, props.sideboard));
</script>

<template>
    <!-- One line under or over the board in portrait; a short column in the landscape rail. -->
    <div
        class="flex min-w-0 flex-none rounded-md border border-white/5 bg-black/40 outline-1 outline-black/60"
        :class="stacked ? 'flex-col gap-2 p-2' : 'h-10 items-center gap-2 px-1.5'"
    >
        <!-- The name gives way first on a narrow phone; the centre line names the active player anyway. -->
        <div class="flex min-w-0 items-center gap-1.5" :class="stacked ? '' : 'flex-[1_1_0]'">
            <div
                class="relative grid size-6 flex-none place-items-center rounded-full text-[11px] font-bold"
                :class="[
                    opponent ? 'bg-accent text-foreground' : 'bg-primary text-primary-foreground',
                    active ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent' : '',
                ]"
            >
                {{ player.Name.charAt(0).toUpperCase() }}
                <span
                    v-if="priority"
                    title="Holds priority"
                    class="absolute -top-0.5 -right-0.5 size-2 animate-pulse rounded-full border border-black bg-primary"
                />
            </div>
            <span class="truncate text-[12.5px] font-semibold">{{ player.Name }}</span>
            <Trophy v-if="winner" :size="13" class="flex-none text-yellow-400" />
        </div>

        <div class="flex flex-none items-center gap-2" :class="stacked ? 'flex-wrap gap-y-1' : ''">
            <span v-if="player.Life != null" title="Life" class="flex items-center gap-1">
                <Heart :size="13" class="text-[#e5484d]" />
                <span class="text-[15px] font-bold tabular-nums" :class="player.Life <= 5 ? 'text-[#e5484d]' : ''">{{ player.Life }}</span>
            </span>
            <span
                v-if="clock"
                title="Chess clock"
                class="flex items-center gap-0.5 font-mono text-[11.5px] tabular-nums"
                :class="(timeLeft ?? Infinity) < LOW_CLOCK_MS ? 'text-[#e5484d]' : priority ? 'text-foreground' : 'text-muted-foreground'"
            >
                <Timer :size="12" />{{ clock }}
            </span>
            <span v-if="player.HandCount != null" title="Cards in hand" class="flex items-center gap-0.5 text-muted-foreground">
                <Hand :size="12" /><span class="text-foreground tabular-nums">{{ player.HandCount }}</span>
            </span>
            <span v-if="player.LibraryCount != null" title="Cards in library" class="flex items-center gap-0.5 text-muted-foreground">
                <Layers :size="12" /><span class="text-foreground tabular-nums">{{ player.LibraryCount }}</span>
            </span>
        </div>

        <div class="flex flex-none items-center gap-0.5" :class="stacked ? 'flex-wrap gap-1' : ''">
            <button
                v-for="item in zones"
                :key="item.zone"
                type="button"
                :title="item.zone === 'Hand' ? 'Revealed cards' : item.label"
                class="replay-bevel inline-flex h-7.5 cursor-pointer items-center gap-0.5 rounded-md border border-black/60 px-1.25 text-[12px]"
                @click="emit('openZone', item.zone, $event)"
            >
                <component :is="item.icon" :size="13" class="text-muted-foreground" />
                <span class="tabular-nums">{{ zoneCounts[item.zone] }}</span>
            </button>
        </div>
    </div>
</template>
