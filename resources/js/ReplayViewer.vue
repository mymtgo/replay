<script setup lang="ts">
import { computed, provide, shallowRef, toRef, useTemplateRef, watch, type Component } from 'vue';
import ReplayCardPreview from './ReplayCardPreview.vue';
import ReplayEmptyState from './ReplayEmptyState.vue';
import ReplayGameEnd from './ReplayGameEnd.vue';
import ReplayHand from './ReplayHand.vue';
import ReplayLogDrawer from './ReplayLogDrawer.vue';
import ReplayPhaseRail from './ReplayPhaseRail.vue';
import ReplayScrubTooltip from './ReplayScrubTooltip.vue';
import ReplaySide from './ReplaySide.vue';
import ReplayStack from './ReplayStack.vue';
import ReplayTransport from './ReplayTransport.vue';
import ReplayZonePopover from './ReplayZonePopover.vue';
import { replayContextKey } from './replayContext';
import { buildLogItems, deriveTurns } from './replayTimeline';
import { REPLAY_ZONES } from './replayZones';
import type { ReplayFrame, ReplayLogEntry, ReplayMatchGame } from './types';
import { useCardPreview } from './useCardPreview';
import { useReplayBoard } from './useReplayBoard';
import { useReplayClocks } from './useReplayClocks';
import { useReplayFullscreen } from './useReplayFullscreen';
import { useReplayKeyboard } from './useReplayKeyboard';
import { useReplayPlayback } from './useReplayPlayback';
import { useScrubTooltip } from './useScrubTooltip';
import { useZonePopover } from './useZonePopover';

const props = withDefaults(
    defineProps<{
        frames: ReplayFrame[];
        log: ReplayLogEntry[];
        /** Whether you won this game; null when the result is unknown. */
        won: boolean | null;
        gameId: number;
        /** Every game of the match in play order. */
        matchGames: ReplayMatchGame[];
        /** URL of another game in the match. Without it the viewer shows no game switching. */
        gameHref?: (id: number) => string;
        /** Renders game links; pass Inertia's Link to keep navigation in the window. */
        linkComponent?: Component | string;
        /**
         * Listener for `@select-game`. A host with the whole match on one page
         * listens instead of passing `gameHref`, and the picker switches in place.
         */
        onSelectGame?: (id: number) => void;
    }>(),
    { gameHref: undefined, linkComponent: 'a' },
);

const root = useTemplateRef<HTMLElement>('root');
const frames = toRef(props, 'frames');

const total = computed(() => props.frames.length);
const turns = computed(() => deriveTurns(props.frames, props.log));
const logItems = computed(() => buildLogItems(props.frames, props.log, turns.value));

const playback = useReplayPlayback(frames, turns);
const { current, playing, speed } = playback;

const { frame, local, opponent, cards, cardsById, turn, activeId, step, pairs, stack, hand, opponentHand, revealedSoFar, sides, playerName } = useReplayBoard(
    frames,
    current,
    turns,
);

const clocks = useReplayClocks(frames, current, playing, speed);

const preview = useCardPreview(root, cardsById, playerName);
const { card: previewCard, position: previewPosition, chips: previewChips } = preview;
provide(replayContextKey, {
    showPreview: preview.showPreview,
    hidePreview: preview.hidePreview,
    gameHref: props.gameHref ?? null,
    linkComponent: props.linkComponent,
    selectGame: props.onSelectGame ?? null,
});

const revealedCards = computed(() => revealedSoFar.value.map((reveal) => reveal.card));
const popover = useZonePopover(root, cards, revealedCards);
const { open: openZone, zoneCards } = popover;

const { tooltip, setHover } = useScrubTooltip(root, frames, turns, logItems);

const logOpen = shallowRef(false);

function toggleLog() {
    logOpen.value = !logOpen.value;
}

function seekAndPause(index: number) {
    playback.pause();
    playback.seek(index);
}

function dismissOverlays() {
    popover.close();
    preview.hidePreview();
    logOpen.value = false;
}

const fullscreen = useReplayFullscreen(root);

useReplayKeyboard({
    toggle: playback.toggle,
    step: playback.step,
    jumpTurn: playback.jumpTurn,
    toggleLog,
    toggleFullscreen: fullscreen.toggle,
    dismiss: dismissOverlays,
});

const activeName = computed(() => (activeId.value !== null ? playerName(activeId.value) : null));
const activeIsLocal = computed(() => activeId.value !== null && activeId.value === local.value?.Id);
const phasesRecorded = computed(() => props.frames.some((item) => item.content.Step != null || item.content.Phase != null));
const atEnd = computed(() => total.value > 0 && current.value === total.value - 1);

/** Seat of the game's winner, held back until the final frame so the replay does not spoil the result. */
const winnerId = computed(() => {
    if (props.won === null || !atEnd.value) {
        return null;
    }

    return sides.value.find((side) => side.opponent !== props.won)?.player.Id ?? null;
});
const gameIndex = computed(() => props.matchGames.findIndex((item) => item.id === props.gameId));
const matchGame = computed(() => props.matchGames[gameIndex.value] ?? null);
const nextGame = computed(() => {
    if ((!props.gameHref && !props.onSelectGame) || gameIndex.value < 0) {
        return null;
    }

    return props.matchGames[gameIndex.value + 1] ?? null;
});

const endDismissed = shallowRef(false);
const showGameEnd = computed(() => atEnd.value && !playing.value && !endDismissed.value);

watch(atEnd, (value) => {
    if (!value) {
        endDismissed.value = false;
    }
});

const localId = computed(() => local.value?.Id ?? null);
/** Reveals stay listed after MTGO hides them again, so each says whether it is still showing. */
const popoverCaptions = computed(() => {
    if (openZone.value?.zone !== 'Hand') {
        return null;
    }

    return new Map(
        revealedSoFar.value.map((reveal) => {
            if (cardsById.value.get(reveal.card.Id)?.Zone === 'Hand') {
                return [reveal.card.Id, 'In hand'];
            }

            return [reveal.card.Id, reveal.turn !== null ? `Seen turn ${reveal.turn}` : 'Seen before turn 1'];
        }),
    );
});
const popoverTitle = computed(() => (openZone.value ? `${playerName(openZone.value.player)} · ${REPLAY_ZONES[openZone.value.zone].label}` : ''));
</script>

<template>
    <div ref="root" class="replay-theme replay-texture-bg @container relative flex size-full min-h-0 flex-col overflow-hidden text-[13px] leading-snug text-foreground select-none">
        <ReplayEmptyState v-if="!total" />

        <template v-else>
            <div class="relative flex min-h-0 flex-1">
                <!--
                    Wide viewers: HUDs and the stack in the left column, the board and
                    both hands in the middle, and an empty right column mirroring the left so
                    the board centres on the same line as the phase rail.
                -->
                <div
                    class="relative flex min-w-0 flex-1 flex-col @7xl:grid @7xl:grid-cols-[15rem_minmax(0,1fr)_15rem] @7xl:grid-rows-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] @7xl:gap-x-2 @7xl:px-2"
                >
                    <ReplaySide
                        v-for="side in sides"
                        :key="side.player.Id"
                        :class="side.opponent ? 'order-0' : 'order-2'"
                        :player="side.player"
                        :battlefield="side.battlefield"
                        :opponent="side.opponent"
                        :active="side.active"
                        :priority="side.priority"
                        :time-left="clocks.get(side.player.Id) ?? null"
                        :winner="side.player.Id === winnerId"
                        :zone-counts="side.zoneCounts"
                        :open-zone="openZone?.player === side.player.Id ? openZone.zone : null"
                        :pairs="pairs"
                        @toggle-zone="(zone, event) => popover.toggle(side.player.Id, zone, event, side.opponent)"
                    />

                    <ReplayPhaseRail
                        :turn-number="turn?.number ?? null"
                        :active-name="activeName"
                        :active-is-local="activeIsLocal"
                        :step="step"
                        :phases-recorded="phasesRecorded"
                    >
                        <ReplayStack v-if="stack.length" :items="stack" :player-name="playerName" />
                    </ReplayPhaseRail>

                    <ReplayHand v-if="opponent" :cards="opponentHand" :count="opponent.HandCount ?? opponentHand.length" opponent />

                    <ReplayHand :cards="hand" :count="local?.HandCount ?? hand.length" :opponent="false" />
                </div>

                <ReplayLogDrawer
                    :open="logOpen"
                    :items="logItems"
                    :current="current"
                    :local-id="localId"
                    :player-name="playerName"
                    @close="logOpen = false"
                    @seek="seekAndPause"
                />
            </div>

            <ReplayTransport
                :turns="turns"
                :current="current"
                :total="total"
                :playing="playing"
                :speed="speed"
                :timestamp="frame?.timestamp ?? ''"
                :local-id="localId"
                :log-open="logOpen"
                :fullscreen-supported="fullscreen.supported.value"
                :fullscreen="fullscreen.active.value"
                :game-id="gameId"
                :match-games="matchGames"
                :player-name="playerName"
                @toggle="playback.toggle"
                @step="playback.step"
                @jump-turn="playback.jumpTurn"
                @seek="playback.seek"
                @scrub-start="playback.pause"
                @set-speed="playback.setSpeed"
                @toggle-log="toggleLog"
                @toggle-fullscreen="fullscreen.toggle"
                @hover="setHover"
            >
                <template v-if="$slots.actions" #actions>
                    <slot name="actions" />
                </template>
            </ReplayTransport>

            <ReplayGameEnd
                v-if="showGameEnd"
                :game="matchGame"
                :next="nextGame"
                :won="won"
                @restart="playback.toggle"
                @dismiss="endDismissed = true"
            />

            <ReplayScrubTooltip v-if="tooltip" :tooltip="tooltip" />

            <ReplayZonePopover
                v-if="openZone"
                :title="popoverTitle"
                :zone="openZone.zone"
                :cards="zoneCards"
                :captions="popoverCaptions"
                :position="openZone.position"
                @close="popover.close"
            />

            <ReplayCardPreview v-if="previewCard && previewPosition" :card="previewCard" :chips="previewChips" :position="previewPosition" />
        </template>
    </div>
</template>
