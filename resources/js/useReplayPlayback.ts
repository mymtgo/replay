import { computed, onUnmounted, readonly, shallowRef, watch, type Ref } from 'vue';
import type { ReplayTurn } from './types';

export const REPLAY_SPEEDS = [0.5, 1, 1.5, 2, 4];

/** Moments recorded in the same second still show for a while, so a burst of lines can be followed. */
const MIN_STEP_MS = 400;

/** How long playback holds a moment: the real time until the next one, thinking included, scaled by speed. */
export function stepDuration(times: number[], index: number, speed: number): number {
    const from = times[index];
    const to = times[index + 1];

    if (from === undefined || to === undefined) {
        return MIN_STEP_MS / speed;
    }

    return Math.max(MIN_STEP_MS, (to - from) * 1000) / speed;
}

/** Moment cursor, play/pause and turn jumps for a replay. */
export function useReplayPlayback(times: Readonly<Ref<number[]>>, turns: Readonly<Ref<ReplayTurn[]>>) {
    const count = computed(() => times.value.length);
    const stops = computed(() => turns.value.map((turn) => turn.from));
    const current = shallowRef(0);
    const playing = shallowRef(false);
    const speed = shallowRef(1);
    let timer: ReturnType<typeof setTimeout> | null = null;

    function clamp(index: number): number {
        return Math.max(0, Math.min(count.value - 1, index));
    }

    function stopTimer() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    }

    function pause() {
        stopTimer();
        playing.value = false;
    }

    function seek(index: number) {
        current.value = clamp(index);
    }

    function step(delta: number) {
        pause();
        seek(current.value + delta);
    }

    function schedule() {
        stopTimer();
        timer = setTimeout(
            () => {
                if (current.value >= count.value - 1) {
                    pause();

                    return;
                }

                current.value++;
                schedule();
            },
            stepDuration(times.value, current.value, speed.value),
        );
    }

    function toggle() {
        if (playing.value) {
            pause();

            return;
        }

        if (current.value >= count.value - 1) {
            current.value = 0;
        }

        playing.value = true;
        schedule();
    }

    function setSpeed(value: number) {
        speed.value = value;

        if (playing.value) {
            schedule();
        }
    }

    /**
     * Back goes to the start of the current turn, or the previous turn when
     * already at (or one moment past) its start. Forward goes to the next turn.
     */
    function jumpTurn(direction: -1 | 1) {
        pause();
        const bounds = stops.value;

        if (direction > 0) {
            const next = bounds.find((from) => from > current.value);
            seek(next ?? count.value - 1);

            return;
        }

        const index = bounds.findLastIndex((from) => from <= current.value);
        const from = bounds[index];

        if (from !== undefined && current.value - from > 1) {
            seek(from);

            return;
        }

        seek(bounds[index - 1] ?? 0);
    }

    watch(count, () => seek(current.value));

    onUnmounted(stopTimer);

    return { current: readonly(current), playing: readonly(playing), speed: readonly(speed), seek, step, toggle, pause, setSpeed, jumpTurn };
}
