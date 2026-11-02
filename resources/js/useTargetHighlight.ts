import { computed, readonly, shallowRef, type Ref } from 'vue';
import { NO_MARKS, targetMarks, type TargetMarks } from './replayTargets';
import type { ReplayCardView, ReplayStackItem } from './types';

/** Which stack entry the board marks the targets of, and which one of its targets when a single line is pointed at. */
type Pointed = { key: string; target: number | null };

/**
 * Marks the targets of a stack entry on the board. Pointing at an entry (or
 * focusing it) marks them while it lasts; a tap on a touch screen pins an
 * entry, which keeps its marks until it is tapped again or the moment changes.
 * Pointing wins over a pin, and the pin comes back when the pointer leaves.
 */
export function useTargetHighlight(
    stack: Readonly<Ref<ReplayStackItem[]>>,
    zones: Readonly<Ref<ReadonlyMap<string, string | null>>>,
    cards: Readonly<Ref<ReadonlyMap<string, ReplayCardView>>>,
    /** What last pressed: a mouse click does not pin, since hover already marks. */
    lastPointer: Readonly<Ref<string | null>>,
) {
    const pointed = shallowRef<Pointed | null>(null);
    const focused = shallowRef<string | null>(null);
    const pinned = shallowRef<string | null>(null);

    const active = computed<Pointed | null>(() => pointed.value ?? (focused.value ? { key: focused.value, target: null } : pinned.value ? { key: pinned.value, target: null } : null));

    /** Derived from the entry still on the stack, so a stale key marks nothing. */
    const marks = computed<TargetMarks>(() => {
        const item = active.value ? stack.value.find((entry) => entry.card.key === active.value!.key) : null;

        return item ? targetMarks(item.card.choices, zones.value, cards.value, active.value!.target) : NO_MARKS;
    });

    return {
        marks,
        pinned: readonly(pinned),
        /** Touch has no hover: browsers fake one on a tap, which would hold the marks after the pin is let go. */
        point: (key: string, target: number | null = null) => {
            if (lastPointer.value !== 'touch' && lastPointer.value !== 'pen') {
                pointed.value = { key, target };
            }
        },
        leave: () => (pointed.value = null),
        focus: (key: string) => (focused.value = key),
        blur: (key: string) => {
            if (focused.value === key) {
                focused.value = null;
            }
        },
        /** Pins from touch or keyboard; a mouse click leaves the hover marks alone. */
        togglePin: (key: string, viaKeyboard = false) => {
            if (lastPointer.value === 'mouse' && !viaKeyboard) {
                return;
            }

            pinned.value = pinned.value === key ? null : key;
        },
        unpin: () => (pinned.value = null),
    };
}
