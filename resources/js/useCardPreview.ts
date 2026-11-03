import { computed, readonly, shallowRef, type Ref } from 'vue';
import { counterLabel, isCreature, previewFaces } from './replayCards';
import type { CardImageResolver, CardPreviewPosition, ReplayCardView } from './types';

/** Space under the preview image for the state chips. */
const INFO_HEIGHT_PX = 54;
const EDGE_PX = 8;
const GAP_PX = 12;
/** Between the two faces of a double-faced card; matches gap-2 in ReplayCardPreview. */
export const FACE_GAP_PX = 8;

/** Width of the whole preview when it is `count` cards wide at a given card width. */
function spread(count: number, width: number): number {
    return width * count + FACE_GAP_PX * (count - 1);
}

/**
 * Large card preview beside the hovered card, kept inside the viewer bounds
 * (an Electron window cannot draw outside itself).
 */
export function useCardPreview(
    root: Readonly<Ref<HTMLElement | null>>,
    cardsByKey: Readonly<Ref<Map<string, ReplayCardView>>>,
    images: Readonly<Ref<CardImageResolver>>,
    /** Type of the latest press on the viewer; a tap pins the preview, a mouse click does not. */
    lastPointer: Readonly<Ref<string | null>>,
    /** Who exiled a card in exile and when; null when the file does not say or the card is not in exile. */
    arrivedBy: (key: string) => string | null,
) {
    const hovered = shallowRef<{ card: ReplayCardView; position: CardPreviewPosition } | null>(null);
    const pinned = shallowRef(false);

    function cardsWide(card: ReplayCardView): number {
        return previewFaces(card, images.value).length;
    }

    function showPreview(event: MouseEvent, card: ReplayCardView) {
        if (!root.value || pinned.value) {
            return;
        }

        const bounds = root.value.getBoundingClientRect();
        const target = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const width = Math.max(150, Math.min(250, ((bounds.height - 16 - INFO_HEIGHT_PX) * 63) / 88));
        const height = (width * 88) / 63 + INFO_HEIGHT_PX;
        const total = spread(cardsWide(card), width);

        let left = target.right - bounds.left + GAP_PX;

        if (left + total > bounds.width - EDGE_PX) {
            left = target.left - bounds.left - total - GAP_PX;
        }

        left = Math.max(EDGE_PX, Math.min(left, bounds.width - total - EDGE_PX));

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
    function pinPreview(event: MouseEvent, card: ReplayCardView) {
        if (!root.value || lastPointer.value === 'mouse') {
            return;
        }

        event.stopPropagation();

        const bounds = root.value.getBoundingClientRect();
        const wide = cardsWide(card);
        const fitWidth = (bounds.width - 32 - FACE_GAP_PX * (wide - 1)) / wide;
        const width = Math.max(120 / wide, Math.min(300, fitWidth, ((bounds.height - 32 - INFO_HEIGHT_PX) * 63) / 88));
        const height = (width * 88) / 63 + INFO_HEIGHT_PX;

        hovered.value = { card, position: { left: (bounds.width - spread(wide, width)) / 2, top: Math.max(EDGE_PX, (bounds.height - height) / 2), width } };
        pinned.value = true;
    }

    function unpin() {
        pinned.value = false;
        hovered.value = null;
    }

    /**
     * Re-read from the current moment so scrubbing while hovering keeps the
     * preview live. A card named only in a list (the sideboard) is not in the
     * state, so it falls back to the card as it was hovered.
     */
    const card = computed(() => (hovered.value ? (cardsByKey.value.get(hovered.value.card.key) ?? hovered.value.card) : null));
    const position = computed(() => hovered.value?.position ?? null);

    const chips = computed(() => {
        const current = card.value;

        if (!current) {
            return [];
        }

        const chips: string[] = [];

        if (isCreature(current)) {
            chips.push(`${current.power}/${current.toughness}`);
        }

        if (current.tapped) {
            chips.push('Tapped');
        }

        Object.entries(current.counters)
            .filter(([, count]) => count > 0)
            .forEach(([kind, count]) => chips.push(counterLabel(kind, count)));

        if (current.damage > 0) {
            chips.push(`${current.damage} damage marked`);
        }

        if (current.attacking !== null) {
            chips.push(`Attacking ${current.attacking.label}`);
        }

        const blocked = current.blocking !== null ? cardsByKey.value.get(current.blocking) : undefined;

        if (blocked) {
            chips.push(`Blocking ${blocked.name ?? 'a creature'}`);
        }

        const host = current.attachedTo !== null ? cardsByKey.value.get(current.attachedTo) : undefined;

        if (host) {
            chips.push(`Attached to ${host.name ?? 'a permanent'}`);
        }

        const exiler = current.exiledWith !== null ? cardsByKey.value.get(current.exiledWith) : undefined;

        if (exiler) {
            chips.push(`Exiled with ${exiler.name ?? 'a permanent'}`);
        } else if (current.exiledWith === null) {
            const by = arrivedBy(current.key);

            if (by) {
                chips.push(by);
            }
        }

        if (current.sourceName && current.kind === 'ability') {
            chips.push(`Ability of ${current.sourceName}`);
        }

        return chips;
    });

    return { card, position, chips, pinned: readonly(pinned), showPreview, hidePreview, pinPreview, unpin };
}
