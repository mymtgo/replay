import { nextTick, onMounted, onUnmounted, readonly, shallowRef, watch, type Ref } from 'vue';
import { fitBoard, type BoardFit, type FitMode, type FitSide } from './replayBoardFit';
import { CARD_HEIGHT_BOUNDS, type ReplayLayout } from './replayLayout';
import type { SideRows } from './replayRows';

const INITIAL: BoardFit = { height: 112, merged: [] };

const MODES: Record<ReplayLayout, FitMode> = { regular: 'merge', 'compact-portrait': 'split', 'compact-landscape': 'single' };

const px = (value: string): number => parseFloat(value) || 0;

/**
 * The one card height the whole board shares, and which sides draw their
 * creatures and other permanents in a single row, so a card is the same size
 * in a hand, a land pile or the creature row. This only reads the DOM: how
 * much room each battlefield has, how tall a row is beyond its cards, how
 * wide a row is. `fitBoard` decides. A resize, a layout switch or a change in
 * what is on the board measures again.
 */
export function useReplayBoardFit(root: Readonly<Ref<HTMLElement | null>>, layout: Readonly<Ref<ReplayLayout>>, rows: Readonly<Ref<SideRows[]>>) {
    const fit = shallowRef<BoardFit>(INITIAL);
    let observer: ResizeObserver | null = null;
    let frame: number | null = null;

    function measure() {
        frame = null;
        const board = root.value;

        if (!board) {
            return;
        }

        const fields = [...board.querySelectorAll<HTMLElement>('[data-replay-field]')];
        const hands = [...board.querySelectorAll<HTMLElement>('[data-replay-hand]')];
        const height = fit.value.height;
        const scrolls = layout.value !== 'regular';

        fields.forEach((field) => observer?.observe(field));

        const first = fields[0]?.querySelector<HTMLElement>('[data-replay-row]');

        if (!first || fields.length !== rows.value.length) {
            return;
        }

        const rowStyle = getComputedStyle(first);
        const fieldStyle = getComputedStyle(fields[0]);
        const sides: FitSide[] = fields.map((field, i) => {
            const row = field.querySelector<HTMLElement>('[data-replay-row]')!;
            const style = getComputedStyle(row);

            return {
                rows: rows.value[i],
                fieldHeight: field.clientHeight,
                width: scrolls ? Infinity : row.clientWidth - px(style.paddingLeft) - px(style.paddingRight),
            };
        });
        const hand = hands[0];

        const next = fitBoard({
            sides,
            hands: hands.map((item) => Number(item.dataset.weight)),
            handsHeight: hands.reduce((sum, item) => sum + item.offsetHeight, 0),
            handPad: hand ? hand.offsetHeight - Number(hand.dataset.weight) * height : 0,
            rowPad: first.offsetHeight - Number(first.dataset.weight) * height,
            fieldPad: px(fieldStyle.paddingTop) + px(fieldStyle.paddingBottom),
            gap: px(rowStyle.columnGap),
            mode: MODES[layout.value],
            bounds: CARD_HEIGHT_BOUNDS[scrolls ? 'compact' : 'regular'],
        });

        if (next.height !== fit.value.height || next.merged.join() !== fit.value.merged.join()) {
            fit.value = next;
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

    watch(layout, () => nextTick(schedule));
    watch(rows, schedule, { flush: 'post' });

    onUnmounted(() => {
        observer?.disconnect();

        if (frame !== null) {
            cancelAnimationFrame(frame);
        }
    });

    return readonly(fit);
}
