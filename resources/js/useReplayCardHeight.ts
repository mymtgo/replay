import { nextTick, onMounted, onUnmounted, readonly, shallowRef, watch, type Ref } from 'vue';
import { CARD_HEIGHT_BOUNDS, nextCardHeight } from './replayLayout';

const INITIAL_HEIGHT = 112;

/**
 * The one card height the whole board shares, so a card is the same size in
 * a hand, a land pile or the creature row, and stays that size as rows fill
 * and empty. Measured from the viewer: each battlefield (`data-replay-field`)
 * gives up whatever its card rows (`data-replay-row`) leave spare, and that
 * room is split between every card row on the board, hands included. Only
 * a resize or a layout switch moves it.
 */
export function useReplayCardHeight(root: Readonly<Ref<HTMLElement | null>>, compact: Readonly<Ref<boolean>>) {
    const height = shallowRef(INITIAL_HEIGHT);
    let observer: ResizeObserver | null = null;
    let frame: number | null = null;

    function measure() {
        frame = null;
        const board = root.value;

        if (!board) {
            return;
        }

        let spare = 0;

        board.querySelectorAll<HTMLElement>('[data-replay-field]').forEach((field) => {
            observer?.observe(field);

            const style = getComputedStyle(field);
            spare += field.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
            field.querySelectorAll<HTMLElement>('[data-replay-row]').forEach((row) => {
                spare -= row.offsetHeight;
            });
        });

        const rows = board.querySelectorAll('[data-replay-row]').length;
        const next = nextCardHeight(height.value, spare, rows, CARD_HEIGHT_BOUNDS[compact.value ? 'compact' : 'regular']);

        if (next !== height.value) {
            height.value = next;
        }
    }

    /** Deferred a frame: resizing rows from inside a ResizeObserver callback trips its loop warning. */
    function schedule() {
        if (frame === null && typeof requestAnimationFrame !== 'undefined') {
            frame = requestAnimationFrame(measure);
        }
    }

    onMounted(() => {
        if (!root.value || typeof ResizeObserver === 'undefined') {
            return;
        }

        observer = new ResizeObserver(schedule);
        observer.observe(root.value);
        schedule();
    });

    watch(compact, () => nextTick(schedule));

    onUnmounted(() => {
        observer?.disconnect();

        if (frame !== null) {
            cancelAnimationFrame(frame);
        }
    });

    return readonly(height);
}
