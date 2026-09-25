import { computed, readonly, shallowRef, type Ref } from 'vue';
import { counterLabel, isFrontRow } from './replayCards';
import type { CardPreviewPosition, ReplayCard } from './types';

/** Space under the preview image for the state chips. */
const INFO_HEIGHT_PX = 54;
const EDGE_PX = 8;
const GAP_PX = 12;

/**
 * Large card preview beside the hovered card, kept inside the viewer bounds
 * (an Electron window cannot draw outside itself).
 */
export function useCardPreview(
    root: Readonly<Ref<HTMLElement | null>>,
    cardsById: Ref<Map<number, ReplayCard>>,
    playerName: (id: number | undefined) => string,
    /** Type of the latest press on the viewer; a tap pins the preview, a mouse click does not. */
    lastPointer: Readonly<Ref<string | null>>,
) {
    const hovered = shallowRef<{ card: ReplayCard; position: CardPreviewPosition } | null>(null);
    const pinned = shallowRef(false);

    function showPreview(event: MouseEvent, card: ReplayCard) {
        if (!root.value || pinned.value) {
            return;
        }

        const bounds = root.value.getBoundingClientRect();
        const target = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const width = Math.max(150, Math.min(250, ((bounds.height - 16 - INFO_HEIGHT_PX) * 63) / 88));
        const height = (width * 88) / 63 + INFO_HEIGHT_PX;

        let left = target.right - bounds.left + GAP_PX;

        if (left + width > bounds.width - EDGE_PX) {
            left = target.left - bounds.left - width - GAP_PX;
        }

        left = Math.max(EDGE_PX, Math.min(left, bounds.width - width - EDGE_PX));

        const centred = target.top - bounds.top + target.height / 2 - height / 2;
        const top = Math.min(Math.max(EDGE_PX, centred), bounds.height - height - EDGE_PX);

        hovered.value = { card, position: { left, top, width } };
    }

    function hidePreview() {
        if (!pinned.value) {
            hovered.value = null;
        }
    }

    /**
     * Touch has no hover, so a tap opens the preview centred and as large as
     * fits, and it stays until tapped away.
     */
    function pinPreview(event: MouseEvent, card: ReplayCard) {
        if (!root.value || lastPointer.value === 'mouse') {
            return;
        }

        event.stopPropagation();

        const bounds = root.value.getBoundingClientRect();
        const width = Math.max(120, Math.min(300, bounds.width - 32, ((bounds.height - 32 - INFO_HEIGHT_PX) * 63) / 88));
        const height = (width * 88) / 63 + INFO_HEIGHT_PX;

        hovered.value = { card, position: { left: (bounds.width - width) / 2, top: Math.max(EDGE_PX, (bounds.height - height) / 2), width } };
        pinned.value = true;
    }

    function unpin() {
        pinned.value = false;
        hovered.value = null;
    }

    /**
     * Re-read from the current frame so scrubbing while hovering keeps the
     * preview live. A known opponent hand card is absent from later frames,
     * so it falls back to the card as it was hovered.
     */
    const card = computed(() => (hovered.value ? (cardsById.value.get(hovered.value.card.Id) ?? hovered.value.card) : null));
    const position = computed(() => hovered.value?.position ?? null);

    const chips = computed(() => {
        const current = card.value;

        if (!current) {
            return [];
        }

        const chips: string[] = [];

        if (current.Zone === 'Battlefield' && isFrontRow(current) && current.Power != null) {
            chips.push(`${current.Power}/${current.Toughness}`);
        }

        if (current.Tapped) {
            chips.push('Tapped');
        }

        Object.entries(current.Counters ?? {})
            .filter(([, count]) => count > 0)
            .forEach(([kind, count]) => chips.push(counterLabel(kind, count)));

        if ((current.Damage ?? 0) > 0) {
            chips.push(`${current.Damage} damage marked`);
        }

        if (current.Attacking != null) {
            chips.push(`Attacking ${playerName(current.Attacking)}`);
        }

        const blocked = current.Blocking != null ? cardsById.value.get(current.Blocking) : undefined;

        if (blocked) {
            chips.push(`Blocking ${blocked.name ?? 'a creature'}`);
        }

        return chips;
    });

    return { card, position, chips, pinned: readonly(pinned), showPreview, hidePreview, pinPreview, unpin };
}
