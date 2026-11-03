<script setup lang="ts">
import { Crosshair, Hand, Layers, Timer, Trophy } from 'lucide-vue-next';
import { computed } from 'vue';
import { useReplayContext } from './replayContext';
import ReplayLifeHistory from './ReplayLifeHistory.vue';
import ReplayPlayerCounters from './ReplayPlayerCounters.vue';
import ReplayTargetMark from './ReplayTargetMark.vue';
import { playerMark, zoneMark } from './replayTargets';
import { hudZones } from './replayZones';
import type { ReplayPlayerView, ReplayZone } from './types';

const LOW_CLOCK_MS = 5 * 60 * 1000;

const props = defineProps<{
    player: ReplayPlayerView;
    opponent: boolean;
    active: boolean;
    priority: boolean;
    winner: boolean;
    zoneCounts: Record<ReplayZone, number>;
    /** Offer the sideboard: when the game lists this player's deck. */
    sideboard: boolean;
    /** Landscape phones stack the HUD in a narrow rail beside the board. */
    stacked: boolean;
}>();

const emit = defineEmits<{
    openZone: [zone: ReplayZone, event: MouseEvent];
}>();

const { highlightedTargets } = useReplayContext();

const clock = computed(() => {
    if (props.player.clock === null) {
        return null;
    }

    const seconds = Math.max(0, Math.round(props.player.clock / 1000));

    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
});

const zones = computed(() => hudZones(props.opponent, props.sideboard));
</script>

<template>
    <!-- One line under or over the board in portrait; a short column in the landscape rail. -->
    <div
        class="relative flex min-w-0 flex-none rounded-md border border-white/5 bg-black/40 outline-1 outline-black/60"
        :class="[stacked ? 'flex-col gap-2 p-2' : 'h-10 items-center gap-2 px-1.5', highlightedTargets.has(playerMark(player.id)) ? 'ring-2 ring-[#e5484d]' : '']"
    >
        <ReplayTargetMark v-if="highlightedTargets.has(playerMark(player.id))" variant="corner" />

        <!-- The name gives way first on a narrow phone; the centre line names the active player anyway. -->
        <div class="flex min-w-0 items-center gap-1.5" :class="stacked ? '' : 'flex-[1_1_0]'">
            <div
                class="relative grid size-6 flex-none place-items-center rounded-full text-[11px] font-bold"
                :class="[
                    opponent ? 'bg-accent text-foreground' : 'bg-primary text-primary-foreground',
                    active ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent' : '',
                ]"
            >
                {{ player.name.charAt(0).toUpperCase() }}
                <span
                    v-if="priority"
                    title="Holds priority"
                    class="absolute -top-0.5 -right-0.5 size-2 animate-pulse rounded-full border border-black bg-primary"
                />
            </div>
            <div class="flex min-w-0 flex-col leading-tight">
                <span class="truncate text-[12.5px] font-semibold">{{ player.name }}</span>
                <span v-if="player.archetype" :title="player.archetype" class="truncate text-[10.5px] text-muted-foreground">{{ player.archetype }}</span>
            </div>
            <Trophy v-if="winner" :size="13" class="flex-none text-yellow-400" />
        </div>

        <div class="flex flex-none items-center gap-2" :class="stacked ? 'flex-wrap gap-y-1' : ''">
            <ReplayLifeHistory :player="player" :opponent="opponent" compact />
            <span
                v-if="player.attackers"
                :title="`Attacked by ${player.attackers} ${player.attackers === 1 ? 'creature' : 'creatures'}`"
                class="flex h-4.5 items-center gap-0.5 rounded-full bg-[#e5484d] px-1.25 text-[10.5px] font-bold text-white"
            >
                <Crosshair :size="11" :stroke-width="2.5" /><span class="tabular-nums">{{ player.attackers }}</span>
            </span>
            <ReplayPlayerCounters :player="player" :size="12" />
            <span
                v-if="clock"
                title="Chess clock"
                class="flex items-center gap-0.5 font-mono text-[11.5px] tabular-nums"
                :class="(player.clock ?? Infinity) < LOW_CLOCK_MS ? 'text-[#e5484d]' : priority ? 'text-foreground' : 'text-muted-foreground'"
            >
                <Timer :size="12" />{{ clock }}
            </span>
            <span title="Cards in hand" class="flex items-center gap-0.5 text-muted-foreground">
                <Hand :size="12" /><span class="text-foreground tabular-nums">{{ player.handCount }}</span>
            </span>
            <span title="Cards in library" class="flex items-center gap-0.5 text-muted-foreground">
                <Layers :size="12" /><span class="text-foreground tabular-nums">{{ player.librarySize }}</span>
            </span>
        </div>

        <div class="flex flex-none items-center gap-0.5" :class="stacked ? 'flex-wrap gap-1' : ''">
            <button
                v-for="item in zones"
                :key="item.zone"
                type="button"
                :title="item.zone === 'Hand' ? 'Known cards' : item.label"
                class="replay-bevel relative inline-flex h-7.5 cursor-pointer items-center gap-0.5 rounded-md border border-black/60 px-1.25 text-[12px]"
                :class="highlightedTargets.has(zoneMark(player.id, item.zone)) ? 'ring-2 ring-[#e5484d]' : ''"
                @click="emit('openZone', item.zone, $event)"
            >
                <component :is="item.icon" :size="13" class="text-muted-foreground" />
                <span class="tabular-nums">{{ zoneCounts[item.zone] }}</span>
                <ReplayTargetMark v-if="highlightedTargets.has(zoneMark(player.id, item.zone))" variant="corner" />
            </button>
        </div>
    </div>
</template>
