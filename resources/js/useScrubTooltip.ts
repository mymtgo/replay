import { computed, shallowRef, type Ref } from 'vue';
import { timeLabel, type ReplayTimeline } from './replayGame';
import { stepLabel } from './replayPhases';
import { turnAt } from './replayTimeline';
import type { ReplayLogItem, ScrubHover, ScrubTooltipView } from './types';

const TOOLTIP_WIDTH_PX = 240;

/** Hover card above the scrubber: turn, step, time and the latest log line. */
export function useScrubTooltip(root: Readonly<Ref<HTMLElement | null>>, timeline: Readonly<Ref<ReplayTimeline>>, logItems: Readonly<Ref<ReplayLogItem[]>>) {
    const hover = shallowRef<ScrubHover | null>(null);

    function setHover(value: ScrubHover | null) {
        hover.value = value;
    }

    const tooltip = computed<ScrubTooltipView | null>(() => {
        const state = hover.value;
        const hovered = state ? timeline.value.moments[state.frame] : undefined;

        if (!state || !hovered || !root.value) {
            return null;
        }

        const bounds = root.value.getBoundingClientRect();
        const turn = turnAt(timeline.value.turns, state.frame);
        const step = timeline.value.derived[hovered.index]?.step ?? null;
        const line = logItems.value.findLast((item) => item.kind === 'line' && item.step <= state.frame);

        let title = `Line ${hovered.line.line}`;

        if (turn?.number != null) {
            const label = `${turn.player} · Turn ${turn.playerTurn}`;
            title = step ? `${label} · ${stepLabel(step)}` : label;
        }

        return {
            left: Math.max(8, Math.min(state.clientX - bounds.left - TOOLTIP_WIDTH_PX / 2, bounds.width - TOOLTIP_WIDTH_PX - 8)),
            bottom: bounds.bottom - state.trackTop + 10,
            title,
            time: timeLabel(hovered.time),
            sub: line?.text ?? 'Game start',
        };
    });

    return { tooltip, setHover };
}
