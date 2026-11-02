<script setup lang="ts">
import type { Game, Player } from '@mtgreplay/mtgr';
import { computed, provide, shallowRef, toRef, useTemplateRef, watch, type Component } from 'vue';
import ReplayCardPreview from './ReplayCardPreview.vue';
import ReplayCompactBoard from './ReplayCompactBoard.vue';
import ReplayCompactTransport from './ReplayCompactTransport.vue';
import { replayContextKey } from './replayContext';
import ReplayEffects from './ReplayEffects.vue';
import ReplayEmptyState from './ReplayEmptyState.vue';
import { buildTimeline, gameInfo, matchGames, timeLabel } from './replayGame';
import ReplayGameEnd from './ReplayGameEnd.vue';
import ReplayGamePicker from './ReplayGamePicker.vue';
import ReplayHand from './ReplayHand.vue';
import ReplayHandSheet from './ReplayHandSheet.vue';
import { buildLogItems } from './replayLog';
import ReplayLogDrawer from './ReplayLogDrawer.vue';
import ReplayPhaseRail from './ReplayPhaseRail.vue';
import { stepLabel } from './replayPhases';
import ReplayScrubber from './ReplayScrubber.vue';
import ReplayScrubTooltip from './ReplayScrubTooltip.vue';
import { startStep } from './replayShare';
import ReplayShareCard from './ReplayShareCard.vue';
import ReplaySheet from './ReplaySheet.vue';
import { sideboardCaptions, sideboardCards, sideboardChanges, sideboardNames } from './replaySideboard';
import ReplaySideboardChanges from './ReplaySideboardChanges.vue';
import ReplaySide from './ReplaySide.vue';
import ReplayStack from './ReplayStack.vue';
import { pregameEnd, stepDuration, timelinePositions } from './replayTimeline';
import { exiledBy } from './replayExile';
import { pregameView } from './replayPregame';
import ReplayPregame from './ReplayPregame.vue';
import ReplayTransport from './ReplayTransport.vue';
import { REPLAY_ZONES } from './replayZones';
import ReplayZoneWindow from './ReplayZoneWindow.vue';
import type { CardImageResolver, ReplayCardView, ReplayZone } from './types';
import { useCardPreview } from './useCardPreview';
import { useReplayBoard } from './useReplayBoard';
import { useReplayBoardFit } from './useReplayBoardFit';
import { useReplayFullscreen } from './useReplayFullscreen';
import { useReplayKeyboard } from './useReplayKeyboard';
import { useReplayLayout } from './useReplayLayout';
import { REPLAY_SPEEDS, useReplayPlayback } from './useReplayPlayback';
import { useReplayShare } from './useReplayShare';
import { useScrubTooltip } from './useScrubTooltip';
import { useTargetHighlight } from './useTargetHighlight';
import { useZoneWindows } from './useZoneWindows';

const props = withDefaults(
    defineProps<{
        /** Every game of the file, as `parse(text).file.games` gives them. */
        games: Game[];
        /** Which of `games` to replay. */
        gameIndex: number;
        /** The host's card images, by name and face. */
        cardImage: CardImageResolver;
        /** URL of another game of the match by index. Without it the picker switches in place through `select-game`. */
        gameHref?: (index: number) => string;
        /** Renders game links; pass Inertia's Link to keep navigation in the window. */
        linkComponent?: Component | string;
        /** The moment to open on, from a shared link; kept inside the game. */
        initialStep?: number | null;
        /** A link to this game at a moment. Without it the viewer offers no sharing. */
        shareUrl?: (step: number) => string;
    }>(),
    { gameHref: undefined, linkComponent: 'a', initialStep: null, shareUrl: undefined },
);

const emit = defineEmits<{
    /**
     * The moment the viewer came to rest on: after a seek, step or jump while
     * paused, and when playback stops. Not sent while playing, so a host
     * keeping its address in step does not rewrite it every moment.
     */
    settle: [step: number];
    /** The picker or the end card chose another game of the file. */
    selectGame: [index: number];
}>();

const root = useTemplateRef<HTMLElement>('root');
const game = computed(() => props.games[props.gameIndex]);
const info = computed(() => gameInfo(game.value));
const timeline = computed(() => buildTimeline(game.value));
const images = toRef(props, 'cardImage');

const total = computed(() => timeline.value.moments.length);
const turns = computed(() => timeline.value.turns);
const times = computed(() => timeline.value.times);
const states = computed(() => timeline.value.steps.map((step) => step.state));
const logItems = computed(() => buildLogItems(timeline.value.moments, states.value, turns.value));

const playback = useReplayPlayback(times, turns);
const { current, playing, speed } = playback;

playback.seek(startStep(props.initialStep, total.value));

watch([current, playing], ([index, isPlaying]) => {
    if (!isPlaying) {
        emit('settle', index);
    }
});

/** Each player's sideboard as the game's deck block lists it, so their HUD can open it. */
const sideboards = computed(() => Object.fromEntries(info.value.players.map((player) => [player, sideboardNames(game.value, player)])) as Record<Player, Map<string, number> | null>);
const sideboardSizes = computed(
    () => Object.fromEntries(info.value.players.map((player) => [player, [...(sideboards.value[player]?.values() ?? [])].reduce((sum, count) => sum + count, 0)])) as Record<Player, number>,
);

const { moment, local, opponent, cardsByKey, zones, turn, activeId, step, incomplete, pairs, stack, effects, hand, opponentHand, sides, playerName, inZone } = useReplayBoard(
    game,
    info,
    timeline,
    current,
    images,
    sideboardSizes,
);

const positions = computed(() => timelinePositions(times.value, pregameEnd(turns.value)));
const holdMs = computed(() => stepDuration(times.value, current.value, speed.value));

/** Recorded on press: older Safari does not deliver clicks as PointerEvents, so a click cannot say what made it. */
const lastPointer = shallowRef<string | null>(null);

const pregame = computed(() =>
    turn.value?.number === null && moment.value
        ? pregameView(game.value, states.value, moment.value, info.value.players)
        : null,
);

const exileContext = (key: string) =>
    zones.value.get(key) === 'exile'
        ? exiledBy(timeline.value.moments, states.value, current.value, key)
        : null;

const preview = useCardPreview(root, cardsByKey, images, lastPointer, exileContext);
const { card: previewCard, position: previewPosition, chips: previewChips, pinned: previewPinned } = preview;

const targets = useTargetHighlight(stack, zones, cardsByKey, lastPointer);

/** A pin belongs to the moment it was made. */
watch(current, targets.unpin);

function selectGame(index: number) {
    emit('selectGame', index);
}

provide(replayContextKey, {
    showPreview: preview.showPreview,
    hidePreview: preview.hidePreview,
    pinPreview: preview.pinPreview,
    cardByKey: (key) => cardsByKey.value.get(key) ?? null,
    highlightedTargets: targets.marks,
    pinnedStack: targets.pinned,
    pointStack: targets.point,
    leaveStack: targets.leave,
    focusStack: targets.focus,
    blurStack: targets.blur,
    togglePinStack: targets.togglePin,
    images: props.cardImage,
    gameHref: props.gameHref ?? null,
    linkComponent: props.linkComponent,
    selectGame,
});

const { layout, compact } = useReplayLayout(root);
const boardRows = computed(() => sides.value.map((side) => side.rows));
const boardFit = useReplayBoardFit(root, layout, boardRows);

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

const { tooltip, setHover } = useScrubTooltip(root, timeline, logItems);

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
const activeIsLocal = computed(() => activeId.value !== null && activeId.value === local.value?.id);
const atEnd = computed(() => total.value > 0 && current.value === total.value - 1);

/** Seat of the game's winner, held back until the final moment so the replay does not spoil the result. */
const winnerId = computed(() => (atEnd.value ? info.value.winner : null));
const games = computed(() => matchGames(props.games));
const matchGame = computed(() => games.value[props.gameIndex] ?? null);
const nextGame = computed(() => games.value[props.gameIndex + 1] ?? null);

const endDismissed = shallowRef(false);
const showGameEnd = computed(() => atEnd.value && !playing.value && !endDismissed.value);

watch(atEnd, (value) => {
    if (!value) {
        endDismissed.value = false;
    }
});

const localId = computed(() => local.value?.id ?? null);

/** The sideboard of the perspective player as this game's deck block lists it. */
const sideboardList = computed(() => {
    const names = localId.value ? sideboards.value[localId.value] : null;

    return names && localId.value ? sideboardCards(names, localId.value, props.cardImage) : [];
});
/** What was sided in and out since the previous game of the file, when both list a deck. */
const previousGame = computed(() => props.games[props.gameIndex - 1] ?? null);
const sideboardDiff = computed(() => {
    const now = localId.value ? sideboards.value[localId.value] : null;
    const before = previousGame.value && localId.value ? sideboardNames(previousGame.value, localId.value) : null;

    return now && before && localId.value ? sideboardChanges(before, now, localId.value, props.cardImage) : null;
});
const sideboardNotes = computed(() => (sideboardDiff.value ? sideboardCaptions(sideboardList.value, sideboardDiff.value) : null));
const previousGameNumber = computed(() => (previousGame.value ? gameInfo(previousGame.value).number : null));

function windowCards(player: Player, zone: ReplayZone): ReplayCardView[] {
    if (zone === 'Sideboard') {
        return sideboardList.value;
    }

    if (zone === 'Hand' && player !== localId.value) {
        return opponentHand.value;
    }

    return inZone(zone, player);
}

function windowCaptions(zone: ReplayZone): Map<string, string> | null {
    return zone === 'Sideboard' ? sideboardNotes.value : null;
}

/** The time into the game of the moment showing, as the file writes it. */
const clockTime = computed(() => (moment.value ? timeLabel(moment.value.time) : ''));

const currentStepLabel = computed(() => (step.value ? stepLabel(step.value) : null));
const missingText = computed(() => (turn.value?.number === null ? 'Pregame' : ''));

const shareLink = useReplayShare(() => (props.shareUrl ? props.shareUrl(current.value) : null));
const shareMoment = computed(() =>
    turn.value?.number != null ? [`Turn ${turn.value.number}`, currentStepLabel.value].filter(Boolean).join(' · ') : null,
);

const SHEET_TITLES: Record<ReplaySheetKind, string> = {
    hands: 'Hands',
    timeline: 'Timeline',
    stack: 'Stack',
};

function zoneTitle(player: Player, zone: ReplayZone): string {
    return `${playerName(player)} · ${REPLAY_ZONES[zone].label}`;
}

function openZonesFor(player: Player): ReplayZone[] {
    return windows.value.filter((item) => item.player === player).map((item) => item.zone);
}

function toggleZoneWindow(player: Player, zone: ReplayZone, event: MouseEvent, opponentSide: boolean) {
    zoneWindows.toggle(player, zone, opponentSide ? 'opponent' : 'you', event.currentTarget as HTMLElement);
}
</script>

<template>
    <div
        ref="root"
        :style="{ '--replay-card-h': `${boardFit.height}px` }"
        class="replay-theme replay-texture-bg @container relative flex size-full min-h-0 flex-col overflow-hidden text-[13px] leading-snug text-foreground select-none"
        @pointerdown.capture="lastPointer = $event.pointerType"
    >
        <ReplayEmptyState v-if="!total" />

        <template v-else>
            <div v-if="incomplete" class="flex-none bg-warning/15 px-3 py-1 text-center text-[11.5px] text-warning">
                The recording is incomplete from here: the board may be missing events until the next keyframe.
            </div>

            <div class="relative flex min-h-0 flex-1">
                <ReplayCompactBoard
                    v-if="layout !== 'regular'"
                    :sides="sides"
                    :layout="layout"
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
                    both hands in the middle, and the effects in the right column so
                    the board centres on the same line as the phase rail.
                -->
                <div
                    v-else
                    class="relative flex min-w-0 flex-1 flex-col @7xl:grid @7xl:grid-cols-[15rem_minmax(0,1fr)_15rem] @7xl:grid-rows-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] @7xl:gap-x-2 @7xl:px-2"
                >
                    <ReplaySide
                        v-for="(side, i) in sides"
                        :key="side.player.id"
                        :class="side.opponent ? 'order-0' : 'order-2'"
                        :player="side.player"
                        :rows="side.rows"
                        :one-row="boardFit.merged[i] ?? false"
                        :opponent="side.opponent"
                        :active="side.active"
                        :priority="side.priority"
                        :winner="side.player.id === winnerId"
                        :zone-counts="side.zoneCounts"
                        :sideboard="side.sideboard"
                        :open-zones="openZonesFor(side.player.id)"
                        :pairs="pairs"
                        :tucked="side.tucked"
                        @toggle-zone="(zone, event) => toggleZoneWindow(side.player.id, zone, event, side.opponent)"
                    />

                    <ReplayPhaseRail
                        :turn-number="turn?.number ?? null"
                        :active-name="activeName"
                        :active-is-local="activeIsLocal"
                        :step="step"
                        :missing-text="missingText"
                    >
                        <ReplayStack v-if="stack.length" :items="stack" />
                    </ReplayPhaseRail>

                    <ReplayEffects v-if="effects.length" :effects="effects" />

                    <ReplayHand v-if="opponent" :cards="opponentHand" :count="opponent.handCount" opponent />

                    <ReplayHand :cards="hand" :count="local?.handCount ?? hand.length" :opponent="false" />

                    <ReplayShareCard v-if="shareUrl" :moment="shareMoment" :copied="shareLink.copied.value" @share="shareLink.share(false)" />
                </div>

                <ReplayPregame v-if="pregame" :view="pregame" :local-id="localId" />

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
                :shareable="!!shareUrl"
                @toggle-log="toggleLog"
                @share="shareLink.share(true)"
            >
                <template v-if="$slots.actions" #menu>
                    <slot name="actions" :compact="true" />
                </template>
            </ReplayCompactTransport>

            <ReplayTransport
                v-else
                :turns="turns"
                :current="current"
                :total="total"
                :positions="positions"
                :hold-ms="holdMs"
                :playing="playing"
                :speed="speed"
                :timestamp="clockTime"
                :local-id="localId"
                :log-open="logOpen"
                :fullscreen-supported="fullscreen.supported.value"
                :fullscreen="fullscreen.active.value"
                :game-id="gameIndex"
                :match-games="games"
                :player-name="playerName"
                @toggle="playback.toggle"
                @step="playback.step"
                @jump-turn="playback.jumpTurn"
                @seek="playback.seek"
                @scrub-start="playback.pause"
                @set-speed="playback.setSpeed"
                @toggle-log="toggleLog"
                :shareable="!!shareUrl"
                :share-copied="shareLink.copied.value"
                @toggle-fullscreen="fullscreen.toggle"
                @share="shareLink.share(false)"
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
                        :hand-count="local?.handCount ?? hand.length"
                        :opponent-hand="opponentHand"
                        :opponent-count="opponent?.handCount ?? opponentHand.length"
                        :opponent-name="opponent?.name ?? 'Opponent'"
                    />
                    <div v-else-if="sheet === 'timeline'" class="flex flex-col gap-3 px-4 pb-4">
                        <div class="flex items-baseline justify-between gap-2">
                            <span class="font-mono text-[12.5px] tabular-nums">{{ clockTime }}</span>
                            <span class="text-[11px] text-muted-foreground tabular-nums">{{ current + 1 }} / {{ total }}</span>
                        </div>
                        <div class="flex">
                            <ReplayScrubber
                                :turns="turns"
                                :current="current"
                                :total="total"
                                :positions="positions"
                                :playing="playing"
                                :hold-ms="holdMs"
                                :local-id="localId"
                                :player-name="playerName"
                                @seek="playback.seek"
                                @scrub-start="playback.pause"
                            />
                        </div>
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <ReplayGamePicker v-if="games.length > 1" :games="games" :game-id="gameIndex" />
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
                        <ReplayStack v-if="stack.length" class="w-full!" :items="stack" />
                        <div v-else class="py-4 text-center text-muted-foreground">The stack is empty</div>
                    </div>
                </ReplaySheet>
            </Transition>

            <ReplayGameEnd v-if="showGameEnd" :game="matchGame" :next="nextGame" :won="info.won" @restart="playback.toggle" @dismiss="endDismissed = true" />

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
                        v-if="item.zone === 'Sideboard' && sideboardDiff && previousGameNumber !== null"
                        :game="previousGameNumber"
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
