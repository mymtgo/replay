<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight, Link2, Maximize, Minimize, Pause, Play, ScrollText, SkipBack, SkipForward } from 'lucide-vue-next';
import ReplayGamePicker from './ReplayGamePicker.vue';
import ReplayScrubber from './ReplayScrubber.vue';
import ReplayToggleButton from './ReplayToggleButton.vue';
import { useReplayContext } from './replayContext';
import ReplayPanel from './ui/ReplayPanel.vue';
import type { ReplayMatchGame, ReplayTurn, ScrubHover } from './types';
import { REPLAY_SPEEDS } from './useReplayPlayback';

defineProps<{
    turns: ReplayTurn[];
    /** Frames to mark on the scrubber when there are no turns. */
    markers: number[];
    current: number;
    total: number;
    playing: boolean;
    speed: number;
    timestamp: string;
    localId: number | null;
    logOpen: boolean;
    /** False until mounted, and on hosts that forbid fullscreen, which hides the button. */
    fullscreenSupported: boolean;
    fullscreen: boolean;
    gameId: number;
    matchGames: ReplayMatchGame[];
    playerName: (id: number | undefined) => string;
    /** Whether the host can link to a moment; wide viewers share from a card instead. */
    shareable: boolean;
    shareCopied: boolean;
}>();

const emit = defineEmits<{
    toggle: [];
    step: [delta: number];
    jumpTurn: [direction: -1 | 1];
    seek: [frame: number];
    scrubStart: [];
    setSpeed: [speed: number];
    toggleLog: [];
    toggleFullscreen: [];
    hover: [payload: ScrubHover | null];
    share: [];
}>();

const { gameHref, selectGame } = useReplayContext();

const iconButton = 'grid size-8 cursor-pointer place-items-center rounded-md hover:bg-accent';
</script>

<template>
    <div class="flex-none px-2 pb-2">
        <ReplayPanel class="flex-row flex-wrap items-center gap-x-3.5 gap-y-2 px-3.5 py-2.25">
            <div class="order-1 flex flex-none items-center gap-0.5">
                <button type="button" title="Previous turn (Shift+←)" :class="iconButton" @click="emit('jumpTurn', -1)">
                    <SkipBack :size="16" />
                </button>
                <button type="button" title="Step back (←)" :class="iconButton" @click="emit('step', -1)">
                    <ChevronLeft :size="18" />
                </button>
                <button
                    type="button"
                    title="Play / pause (Space)"
                    class="mx-0.5 grid size-9.5 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    @click="emit('toggle')"
                >
                    <Pause v-if="playing" :size="16" fill="currentColor" :stroke-width="0" />
                    <Play v-else :size="16" fill="currentColor" :stroke-width="0" class="ml-0.5" />
                </button>
                <button type="button" title="Step forward (→)" :class="iconButton" @click="emit('step', 1)">
                    <ChevronRight :size="18" />
                </button>
                <button type="button" title="Next turn (Shift+→)" :class="iconButton" @click="emit('jumpTurn', 1)">
                    <SkipForward :size="16" />
                </button>
            </div>

            <div class="order-2 flex min-w-24 flex-none flex-col gap-px">
                <span class="font-mono text-[12.5px] tabular-nums">{{ timestamp }}</span>
                <span class="text-[11px] text-muted-foreground tabular-nums">{{ current + 1 }} / {{ total }}</span>
            </div>

            <ReplayGamePicker v-if="(gameHref || selectGame) && matchGames.length > 1" class="order-2" :games="matchGames" :game-id="gameId" />

            <ReplayScrubber
                :turns="turns"
                :markers="markers"
                :current="current"
                :total="total"
                :local-id="localId"
                :player-name="playerName"
                @seek="(frame) => emit('seek', frame)"
                @scrub-start="emit('scrubStart')"
                @hover="(payload) => emit('hover', payload)"
            />

            <div class="order-4 flex flex-none items-center gap-0.5 rounded-lg bg-background p-0.5">
                <button
                    v-for="value in REPLAY_SPEEDS"
                    :key="value"
                    type="button"
                    class="h-6.5 min-w-9 cursor-pointer rounded-md px-1.5 text-xs font-semibold tabular-nums"
                    :class="value === speed ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'"
                    @click="emit('setSpeed', value)"
                >
                    {{ value }}×
                </button>
            </div>

            <ReplayToggleButton class="order-5" title="Game log (L)" :active="logOpen" :icon="ScrollText" @click="emit('toggleLog')">
                <span>Log</span>
            </ReplayToggleButton>

            <button
                v-if="fullscreenSupported"
                type="button"
                :title="fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'"
                class="order-5"
                :class="iconButton"
                @click="emit('toggleFullscreen')"
            >
                <Minimize v-if="fullscreen" :size="16" />
                <Maximize v-else :size="16" />
            </button>

            <button
                v-if="shareable"
                type="button"
                :title="shareCopied ? 'Link copied' : 'Copy a link to this moment'"
                class="order-5 @7xl:hidden"
                :class="iconButton"
                @click="emit('share')"
            >
                <Check v-if="shareCopied" :size="16" />
                <Link2 v-else :size="16" />
            </button>

            <div v-if="$slots.actions" class="order-6 flex flex-none items-center gap-2">
                <slot name="actions" />
            </div>
        </ReplayPanel>
    </div>
</template>
