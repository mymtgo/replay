<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import { computed, useTemplateRef } from 'vue';
import { frameAtPosition } from './replayTimeline';
import type { ReplayTurn, ScrubHover } from './types';

/** A turn segment narrower than this hides its T-label. */
const MIN_LABEL_WIDTH_PX = 36;

const props = defineProps<{
    turns: ReplayTurn[];
    current: number;
    total: number;
    /** Each frame's place on the track, from timelinePositions. */
    positions: number[];
    playing: boolean;
    /** How long playback holds the current frame. */
    holdMs: number;
    localId: string | null;
    playerName: (id: string | undefined) => string;
}>();

const emit = defineEmits<{
    seek: [frame: number];
    scrubStart: [];
    hover: [payload: ScrubHover | null];
}>();

const track = useTemplateRef<HTMLElement>('track');
const { width } = useElementSize(track);
let dragging = false;

const position = (frame: number): number => props.positions[Math.min(frame, props.positions.length - 1)] ?? 0;

/**
 * Where the playhead is heading. While playing it glides to the next frame's
 * moment over the time the current frame is held, so it moves with the game
 * clock instead of hopping from frame to frame.
 */
const playhead = computed(() => position(props.playing && props.current < props.total - 1 ? props.current + 1 : props.current));
const glide = computed(() => ({ transitionDuration: `${props.playing ? props.holdMs : 100}ms` }));

const segments = computed(() =>
    props.turns.map((turn, i) => {
        const left = position(turn.from);
        const widthPct = position(turn.to) - left;
        const mine = turn.player !== null && turn.player === props.localId;

        return {
            key: i,
            turn,
            left,
            width: widthPct,
            mine,
            fill: widthPct > 0 ? Math.max(0, Math.min(100, ((playhead.value - left) / widthPct) * 100)) : playhead.value >= left ? 100 : 0,
            showLabel: turn.number !== null && (widthPct / 100) * width.value >= MIN_LABEL_WIDTH_PX,
            title: `Jump to ${turn.player !== null ? `${props.playerName(turn.player)}, ` : ''}turn ${turn.playerTurn} (game turn ${turn.number})`,
        };
    }),
);

/** One tick per moment start, skipping those too close to the last to tell apart at this width. */
const ticks = computed(() => {
    const minGap = width.value > 0 ? (3 / width.value) * 100 : 1;
    const out: number[] = [];

    props.positions.slice(0, -1).forEach((at) => {
        if (out.length === 0 || at - out[out.length - 1] >= minGap) {
            out.push(at);
        }
    });

    return out;
});

function frameAt(event: PointerEvent, rect: DOMRect): number {
    return frameAtPosition(props.positions, ((event.clientX - rect.left) / rect.width) * 100);
}

function onDown(event: PointerEvent) {
    if (!track.value) {
        return;
    }

    emit('scrubStart');
    dragging = true;
    track.value.setPointerCapture(event.pointerId);
    emit('seek', frameAt(event, track.value.getBoundingClientRect()));
}

function onMove(event: PointerEvent) {
    if (!track.value) {
        return;
    }

    const rect = track.value.getBoundingClientRect();
    const frame = frameAt(event, rect);

    if (dragging) {
        emit('seek', frame);
    }

    emit('hover', { frame, clientX: event.clientX, trackTop: rect.top });
}

function onUp() {
    dragging = false;
}

function onLeave() {
    if (!dragging) {
        emit('hover', null);
    }
}

function jump(turn: ReplayTurn) {
    emit('scrubStart');
    emit('seek', turn.from);
}
</script>

<template>
    <div
        ref="track"
        class="relative order-3 h-7.5 min-w-0 flex-[1_1_200px] cursor-pointer touch-none rounded-md bg-background"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onLeave"
    >
        <div
            v-for="segment in segments"
            :key="segment.key"
            class="absolute inset-y-0 box-border overflow-hidden px-0.5 py-0.75"
            :style="{ left: `${segment.left}%`, width: `${segment.width}%` }"
        >
            <div class="relative h-full overflow-hidden rounded" :class="segment.turn.player === null ? 'bg-foreground/7' : segment.mine ? 'bg-primary/20' : 'bg-(--replay-opponent)/20'">
                <div
                    class="absolute inset-y-0 left-0 transition-[width] ease-linear"
                    :class="segment.turn.player === null ? 'bg-foreground/35' : segment.mine ? 'bg-primary/80' : 'bg-(--replay-opponent)/75'"
                    :style="{ width: `${segment.fill}%`, ...glide }"
                />
            </div>
            <button
                v-if="segment.showLabel"
                type="button"
                :title="segment.title"
                class="absolute top-1/2 left-1.5 h-4.25 -translate-y-1/2 cursor-pointer rounded bg-card px-1.25 text-[10.5px] font-bold hover:bg-accent"
                @pointerdown.stop="jump(segment.turn)"
            >
                T{{ segment.turn.playerTurn }}
            </button>
        </div>
        <!-- A tick where each moment starts, so a stretch with nothing in it reads as a wait, not as a scrubber that does nothing. -->
        <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 bottom-1 h-1.5">
            <span v-for="at in ticks" :key="at" class="absolute top-0 h-full w-px bg-white/30" :style="{ left: `${at}%` }" />
        </div>

        <div
            class="pointer-events-none absolute -inset-y-1 -ml-[1.5px] w-0.75 rounded-sm bg-foreground shadow-[0_0_0_2px_var(--card)] transition-[left] ease-linear"
            :style="{ left: `${playhead}%`, ...glide }"
        />
    </div>
</template>
