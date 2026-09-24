<script setup lang="ts">
import { computed, provide, shallowRef, toRef, useTemplateRef, watch, type Component } from 'vue';
import ReplayCardPreview from './ReplayCardPreview.vue';
import ReplayCompactBoard from './ReplayCompactBoard.vue';
import ReplayCompactTransport from './ReplayCompactTransport.vue';
import { replayContextKey } from './replayContext';
import ReplayEmptyState from './ReplayEmptyState.vue';
import ReplayGameEnd from './ReplayGameEnd.vue';
import ReplayGamePicker from './ReplayGamePicker.vue';
import ReplayHand from './ReplayHand.vue';
import ReplayHandSheet from './ReplayHandSheet.vue';
import ReplayLogDrawer from './ReplayLogDrawer.vue';
import ReplayPhaseRail from './ReplayPhaseRail.vue';
import { phaseMissingText, stepLabel } from './replayPhases';
import ReplayScrubber from './ReplayScrubber.vue';
import ReplayScrubTooltip from './ReplayScrubTooltip.vue';
import ReplaySheet from './ReplaySheet.vue';
import ReplaySideboardChanges from './ReplaySideboardChanges.vue';
import { sideboardCaptions, sideboardChanges, type ReplaySideboardBaseline } from './replaySideboard';
import ReplaySide from './ReplaySide.vue';
import ReplayStack from './ReplayStack.vue';
import { normaliseFrames } from './replayFrames';
import { buildLogItems, deriveTurns } from './replayTimeline';
import ReplayTransport from './ReplayTransport.vue';
import { REPLAY_ZONES } from './replayZones';
import ReplayZoneWindow from './ReplayZoneWindow.vue';
import type { ReplayCard, ReplayFrame, ReplayLogEntry, ReplayMatchGame, ReplaySideboardEntry, ReplayZone } from './types';
import { useCardPreview } from './useCardPreview';
import { useReplayBoard } from './useReplayBoard';
import { useReplayClocks } from './useReplayClocks';
import { useReplayFullscreen } from './useReplayFullscreen';
import { useReplayKeyboard } from './useReplayKeyboard';
import { useReplayLayout } from './useReplayLayout';
import { REPLAY_SPEEDS, useReplayPlayback } from './useReplayPlayback';
import { useScrubTooltip } from './useScrubTooltip';
import { zoneCardsFor } from './replayZoneCards';
import { useZoneWindows } from './useZoneWindows';

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
        /**
         * Your sideboard as the previous recorded game of the match began,
         * so the sideboard window can show what you sided in and out. Null
         * for a first game or when the host has no other game.
         */
        previousSideboard?: ReplaySideboardBaseline | null;
        /**
         * Your sideboard as this game began, when the host recorded it. The
         * viewer falls back to the frames, which only log-built games fill.
         */
        sideboard?: ReplaySideboardEntry[] | null;
    }>(),
    { gameHref: undefined, linkComponent: 'a', previousSideboard: null, sideboard: null },
);

const root = useTemplateRef<HTMLElement>('root');
/** Every card in the zone it is really in; see normaliseFrames. */
const frames = computed(() => normaliseFrames(props.frames));

const total = computed(() => frames.value.length);
const turns = computed(() => deriveTurns(frames.value, props.log));
const logItems = computed(() => buildLogItems(frames.value, props.log, turns.value));

const playback = useReplayPlayback(frames, turns);
const { current, playing, speed, markers } = playback;

const { frame, local, opponent, cards, cardsById, turn, activeId, step, pairs, stack, hand, opponentHand, revealedSoFar, sides, playerName, startingSideboard, sideboard } =
    useReplayBoard(frames, current, turns, toRef(props, 'sideboard'));

const clocks = useReplayClocks(frames, current, playing, speed);

/** Recorded on press: older Safari does not deliver clicks as PointerEvents, so a click cannot say what made it. */
const lastPointer = shallowRef<string | null>(null);

const preview = useCardPreview(root, cardsById, playerName, lastPointer);
const { card: previewCard, position: previewPosition, chips: previewChips, pinned: previewPinned } = preview;
provide(replayContextKey, {
    showPreview: preview.showPreview,
    hidePreview: preview.hidePreview,
    pinPreview: preview.pinPreview,
    gameHref: props.gameHref ?? null,
    linkComponent: props.linkComponent,
    selectGame: props.onSelectGame ?? null,
});

const revealedCards = computed(() => revealedSoFar.value.map((reveal) => reveal.card));
const { layout, compact } = useReplayLayout(root);

const zoneWindows = useZoneWindows(root, compact);
const { windows } = zoneWindows;

/**
 * Compact viewers show hands, the timeline and the stack in one bottom sheet
 * at a time. Zones open as windows there too, so a graveyard can stay in
 * view while the game plays.
 */
type ReplaySheetKind = 'hands' | 'timeline' | 'stack';

const sheet = shallowRef<ReplaySheetKind | null>(null);

function openSheet(next: ReplaySheetKind) {
    sheet.value = sheet.value === next ? null : next;
}

/** Window positions are sized for one layout, and sheets only exist on compact. */
watch(layout, (value) => {
    zoneWindows.closeAll();

    if (value === 'regular') {
        sheet.value = null;
    }
});

const { tooltip, setHover } = useScrubTooltip(root, frames, turns, logItems);

const logOpen = shallowRef(false);

function toggleLog() {
    logOpen.value = !logOpen.value;
}

function seekAndPause(index: number) {
    playback.pause();
    playback.seek(index);
}

/** Escape peels one layer at a time: the sheet or top zone window first, then the log. */
function dismissOverlays() {
    if (previewPinned.value) {
        preview.unpin();

        return;
    }

    preview.hidePreview();

    if (sheet.value) {
        sheet.value = null;

        return;
    }

    if (zoneWindows.closeTop()) {
        return;
    }

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
const phasesRecorded = computed(() => frames.value.some((item) => item.content.Step != null || item.content.Phase != null));
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
/** Reveals stay listed after they leave hand, so each says whether it is still known to be there. */
const handCaptions = computed(() => {
    const known = new Set(opponentHand.value.map((card) => card.Id));

    return new Map(
        revealedSoFar.value.map((reveal) => {
            if (known.has(reveal.card.Id)) {
                return [reveal.card.Id, 'In hand'];
            }

            return [reveal.card.Id, reveal.turn !== null ? `Seen turn ${reveal.turn}` : 'Seen before turn 1'];
        }),
    );
});
/**
 * What you sided in and out since the previous game. Both ends are taken as
 * each game began, so a card fetched from the sideboard mid-game is not
 * counted; the window's list itself follows the frame.
 */
const sideboardDiff = computed(() =>
    props.previousSideboard && startingSideboard.value ? sideboardChanges(props.previousSideboard.cards, startingSideboard.value) : null,
);
/** Your sideboard as the window lists it, by name. */
const sideboardList = computed(() => [...sideboard.value].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')));
/** Marks the copies in your sideboard that came out of the deck for this game. */
const sideboardNotes = computed(() => (sideboardDiff.value ? sideboardCaptions(sideboardList.value, sideboardDiff.value) : null));

function windowCards(player: number, zone: ReplayZone): ReplayCard[] {
    return zone === 'Sideboard' ? sideboardList.value : zoneCardsFor(cards.value, revealedCards.value, player, zone);
}

function windowCaptions(zone: ReplayZone): Map<number, string> | null {
    if (zone === 'Hand') {
        return handCaptions.value;
    }

    return zone === 'Sideboard' ? sideboardNotes.value : null;
}

/** Synced matches carry ISO timestamps; show only the time, as desktop replays do. */
const clockTime = computed(() => {
    const timestamp = frame.value?.timestamp ?? '';

    return timestamp.includes('T') ? timestamp.slice(timestamp.indexOf('T') + 1).replace(/(Z|[+-]\d{2}:?\d{2})$/, '') : timestamp;
});

const missingText = computed(() => phaseMissingText(phasesRecorded.value, turn.value?.number ?? null));
const currentStepLabel = computed(() => (step.value ? stepLabel(step.value) : null));

const SHEET_TITLES: Record<ReplaySheetKind, string> = {
    hands: 'Hands',
    timeline: 'Timeline',
    stack: 'Stack',
};

function zoneTitle(player: number, zone: ReplayZone): string {
    return `${playerName(player)} · ${REPLAY_ZONES[zone].label}`;
}

function openZonesFor(player: number): ReplayZone[] {
    return windows.value.filter((item) => item.player === player).map((item) => item.zone);
}

function toggleZoneWindow(player: number, zone: ReplayZone, event: MouseEvent, opponentSide: boolean) {
    zoneWindows.toggle(player, zone, opponentSide ? 'opponent' : 'you', event.currentTarget as HTMLElement);
}
</script>

<template>
    <div
        ref="root"
        class="replay-theme replay-texture-bg @container relative flex size-full min-h-0 flex-col overflow-hidden text-[13px] leading-snug text-foreground select-none"
        @pointerdown.capture="lastPointer = $event.pointerType"
    >
        <ReplayEmptyState v-if="!total" />

        <template v-else>
            <div class="relative flex min-h-0 flex-1">
                <ReplayCompactBoard
                    v-if="layout !== 'regular'"
                    :sides="sides"
                    :layout="layout"
                    :clocks="clocks"
                    :winner-id="winnerId"
                    :pairs="pairs"
                    :turn-number="turn?.number ?? null"
                    :active-name="activeName"
                    :active-is-local="activeIsLocal"
                    :step-label="currentStepLabel"
                    :missing-text="missingText"
                    :stack-count="stack.length"
                    @open-zone="(player, zone, event) => toggleZoneWindow(player, zone, event, player !== localId)"
                    @open-stack="openSheet('stack')"
                />

                <!--
                    Wide viewers: HUDs and the stack in the left column, the board and
                    both hands in the middle, and an empty right column mirroring the left so
                    the board centres on the same line as the phase rail.
                -->
                <div
                    v-else
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
                        :sideboard="side.sideboard"
                        :open-zones="openZonesFor(side.player.Id)"
                        :pairs="pairs"
                        @toggle-zone="(zone, event) => toggleZoneWindow(side.player.Id, zone, event, side.opponent)"
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
                    :wide="compact"
                    @close="logOpen = false"
                    @seek="seekAndPause"
                />
            </div>

            <ReplayCompactTransport
                v-if="compact"
                :playing="playing"
                :open-sheet="sheet === 'hands' || sheet === 'timeline' ? sheet : null"
                :slim="layout === 'compact-landscape'"
                @toggle="playback.toggle"
                @step="playback.step"
                @jump-turn="playback.jumpTurn"
                @open-sheet="openSheet"
                @toggle-log="toggleLog"
            >
                <template v-if="$slots.actions" #menu>
                    <slot name="actions" :compact="true" />
                </template>
            </ReplayCompactTransport>

            <ReplayTransport
                v-else
                :turns="turns"
                :markers="markers"
                :current="current"
                :total="total"
                :playing="playing"
                :speed="speed"
                :timestamp="clockTime"
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
                    <slot name="actions" :compact="false" />
                </template>
            </ReplayTransport>

            <Transition :duration="220" enter-from-class="replay-sheet-hidden" leave-to-class="replay-sheet-hidden">
                <ReplaySheet
                    v-if="sheet"
                    :title="SHEET_TITLES[sheet]"
                    :count="sheet === 'stack' ? stack.length : null"
                    :landscape="layout === 'compact-landscape'"
                    @close="sheet = null"
                >
                    <ReplayHandSheet
                        v-if="sheet === 'hands'"
                        :hand="hand"
                        :hand-count="local?.HandCount ?? hand.length"
                        :opponent-hand="opponentHand"
                        :opponent-count="opponent?.HandCount ?? opponentHand.length"
                        :opponent-name="opponent?.Name ?? 'Opponent'"
                    />
                    <div v-else-if="sheet === 'timeline'" class="flex flex-col gap-3 px-4 pb-4">
                        <div class="flex items-baseline justify-between gap-2">
                            <span class="font-mono text-[12.5px] tabular-nums">{{ clockTime }}</span>
                            <span class="text-[11px] text-muted-foreground tabular-nums">{{ current + 1 }} / {{ total }}</span>
                        </div>
                        <div class="flex">
                            <ReplayScrubber
                                :turns="turns"
                                :markers="markers"
                                :current="current"
                                :total="total"
                                :local-id="localId"
                                :player-name="playerName"
                                @seek="playback.seek"
                                @scrub-start="playback.pause"
                            />
                        </div>
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <ReplayGamePicker v-if="(gameHref || onSelectGame) && matchGames.length > 1" :games="matchGames" :game-id="gameId" />
                            <div class="flex flex-none items-center gap-0.5 rounded-lg bg-background p-0.5">
                                <button
                                    v-for="value in REPLAY_SPEEDS"
                                    :key="value"
                                    type="button"
                                    class="h-8 min-w-10 cursor-pointer rounded-md px-1.5 text-xs font-semibold tabular-nums"
                                    :class="value === speed ? 'bg-accent text-foreground' : 'text-muted-foreground'"
                                    @click="playback.setSpeed(value)"
                                >
                                    {{ value }}×
                                </button>
                            </div>
                        </div>
                    </div>
                    <div v-else class="px-3 pb-3">
                        <ReplayStack v-if="stack.length" class="w-full!" :items="stack" :player-name="playerName" />
                        <div v-else class="py-4 text-center text-muted-foreground">The stack is empty</div>
                    </div>
                </ReplaySheet>
            </Transition>

            <ReplayGameEnd
                v-if="showGameEnd"
                :game="matchGame"
                :next="nextGame"
                :won="won"
                @restart="playback.toggle"
                @dismiss="endDismissed = true"
            />

            <ReplayScrubTooltip v-if="tooltip" :tooltip="tooltip" />

            <!-- One layer for every window, so their own stacking never climbs over sheets or the preview. -->
            <div v-if="windows.length" class="pointer-events-none absolute inset-0 z-60">
                <ReplayZoneWindow
                    v-for="item in windows"
                    :key="item.key"
                    :title="zoneTitle(item.player, item.zone)"
                    :zone="item.zone"
                    :cards="windowCards(item.player, item.zone)"
                    :captions="windowCaptions(item.zone)"
                    :left="item.left"
                    :top="item.top"
                    :size="item.size"
                    :z="item.z"
                    :compact="compact"
                    @close="zoneWindows.close(item.key)"
                    @focus="zoneWindows.focus(item.key)"
                    @drag-start="(event, element) => zoneWindows.startDrag(item.key, event, element)"
                    @resize-start="(event, element) => zoneWindows.startResize(item.key, event, element)"
                    @mounted="(element) => zoneWindows.settle(item.key, element)"
                >
                    <ReplaySideboardChanges
                        v-if="item.zone === 'Sideboard' && sideboardDiff && previousSideboard"
                        :game="previousSideboard.game"
                        :changes="sideboardDiff"
                        :small="compact"
                    />
                </ReplayZoneWindow>
            </div>

            <ReplayCardPreview
                v-if="previewCard && previewPosition"
                :card="previewCard"
                :chips="previewChips"
                :position="previewPosition"
                :pinned="previewPinned"
                @close="preview.unpin"
            />
        </template>
    </div>
</template>
