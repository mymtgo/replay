import { useRafFn } from '@vueuse/core';
import { computed, shallowRef, watch, type Ref } from 'vue';
import { clockTimeline, clocksAt, playheadTime } from './replayTimeline';
import type { ReplayFrame } from './types';
import { frameDuration } from './useReplayPlayback';

function sameClocks(a: Map<number, number>, b: Map<number, number>): boolean {
    return a.size === b.size && [...a].every(([id, value]) => b.get(id) === value);
}

/**
 * Game time and chess clocks as shown on screen. Frames can sit seconds
 * apart, so during playback both run on across the time a frame is held
 * rather than waiting for the next frame and jumping. The clocks follow when
 * each really ran (see clockTimeline). Paused or stepping, both show the
 * frame's moment. Only republished when a displayed second changes, so the
 * viewer does not re-render every animation frame.
 */
export function useReplayPlayhead(
    frames: Ref<ReplayFrame[]>,
    current: Readonly<Ref<number>>,
    playing: Readonly<Ref<boolean>>,
    speed: Readonly<Ref<number>>,
) {
    const timeline = computed(() => clockTimeline(frames.value));
    /** Whole seconds into the game, in milliseconds. */
    const elapsed = shallowRef(0);
    const clocks = shallowRef(new Map<number, number>());
    let frameStartedAt = performance.now();

    function publish(progress: number) {
        const time = playheadTime(timeline.value.times, current.value, progress);
        const second = Math.floor(time / 1000) * 1000;
        const next = clocksAt(frames.value, timeline.value, current.value, time);

        if (second !== elapsed.value) {
            elapsed.value = second;
        }

        if (!sameClocks(next, clocks.value)) {
            clocks.value = next;
        }
    }

    const { pause, resume } = useRafFn(
        () => publish(Math.min(1, (performance.now() - frameStartedAt) / frameDuration(frames.value, current.value, speed.value))),
        { immediate: false },
    );

    // Playback restarts the frame's hold on a speed change, so the playhead does too.
    watch(
        [current, timeline, speed],
        () => {
            frameStartedAt = performance.now();
            publish(0);
        },
        { immediate: true },
    );

    watch(
        playing,
        (isPlaying) => {
            frameStartedAt = performance.now();

            if (isPlaying) {
                resume();

                return;
            }

            pause();
            publish(0);
        },
        { immediate: true },
    );

    return { elapsed, clocks };
}
