import { readonly, shallowRef, type Ref } from 'vue';
import {
    clampSize,
    clampWindow,
    fromStoredPosition,
    parseStoredPosition,
    toStoredPosition,
    windowStorageKey,
    type WindowPoint,
    type WindowSize,
} from './replayWindows';
import type { ReplayZone } from './types';

export const ZONE_WINDOW_WIDTH_PX = 380;
/** Phones get a narrower window so some of the board stays in view around it. */
export const COMPACT_ZONE_WINDOW_WIDTH_PX = 272;

/** Used to place a window before it has rendered and can be measured. */
const ASSUMED_HEIGHT_PX = 340;
const COMPACT_ASSUMED_HEIGHT_PX = 240;
const MIN_SIZE: WindowSize = { width: 260, height: 150 };
const CASCADE_PX = 24;
const ANCHOR_GAP_PX = 6;

export type ZoneWindowSide = 'you' | 'opponent';

export type ZoneWindow = {
    key: string;
    player: number;
    side: ZoneWindowSide;
    zone: ReplayZone;
    left: number;
    top: number;
    /** Set once resized; until then the window takes its default width and fits its cards. */
    size: WindowSize | null;
    /**
     * Where the bottom edge was anchored when it opened upward from your HUD,
     * so it can grow up from there once its real height is known.
     */
    anchorBottom: number | null;
    /** Stacking order; the most recently focused window is highest. */
    z: number;
};

function readStored(side: ZoneWindowSide, zone: ReplayZone, compact: boolean) {
    try {
        return parseStoredPosition(window.localStorage.getItem(windowStorageKey(side, zone, compact)));
    } catch {
        return null;
    }
}

function writeStored(item: ZoneWindow, compact: boolean, viewer: WindowSize) {
    try {
        window.localStorage.setItem(windowStorageKey(item.side, item.zone, compact), JSON.stringify(toStoredPosition(item, viewer, item.size)));
    } catch {
        // Storage can be full or blocked; the window simply opens anchored next time.
    }
}

/**
 * Follows the pointer from the pressed handle until it lets go. Pointer
 * capture keeps the gesture alive when the pointer leaves the handle.
 */
function trackPointer(event: PointerEvent, onMove: (dx: number, dy: number) => void, onDone: () => void) {
    const handle = event.currentTarget as HTMLElement;
    const start = { x: event.clientX, y: event.clientY };
    let moved = false;

    handle.setPointerCapture(event.pointerId);

    function move(moveEvent: PointerEvent) {
        moved = true;
        onMove(moveEvent.clientX - start.x, moveEvent.clientY - start.y);
    }

    function up() {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);

        if (moved) {
            onDone();
        }
    }

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
}

/**
 * Floating zone windows. They stay open while the game plays, several at
 * once, and each side's zone remembers where it was dragged to and how big
 * it was made.
 */
export function useZoneWindows(root: Readonly<Ref<HTMLElement | null>>, compact: Readonly<Ref<boolean>>) {
    const windows = shallowRef<ZoneWindow[]>([]);
    let topZ = 0;

    function viewerSize(): WindowSize | null {
        const element = root.value;

        return element ? { width: element.clientWidth, height: element.clientHeight } : null;
    }

    function defaultSize(viewer: WindowSize): WindowSize {
        const width = compact.value ? COMPACT_ZONE_WINDOW_WIDTH_PX : ZONE_WINDOW_WIDTH_PX;
        const height = compact.value ? COMPACT_ASSUMED_HEIGHT_PX : ASSUMED_HEIGHT_PX;

        return { width: Math.min(width, viewer.width - 16), height: Math.min(height, viewer.height - 16) };
    }

    function isOpen(player: number, zone: ReplayZone): boolean {
        return windows.value.some((item) => item.player === player && item.zone === zone);
    }

    function close(key: string) {
        windows.value = windows.value.filter((item) => item.key !== key);
    }

    /** Closes the most recently focused window; false when none are open. */
    function closeTop(): boolean {
        const top = windows.value.reduce<ZoneWindow | null>((best, item) => (!best || item.z > best.z ? item : best), null);

        if (!top) {
            return false;
        }

        close(top.key);

        return true;
    }

    function closeAll() {
        windows.value = [];
    }

    function update(key: string, change: Partial<ZoneWindow>) {
        windows.value = windows.value.map((item) => (item.key === key ? { ...item, ...change } : item));
    }

    function focus(key: string) {
        const target = windows.value.find((item) => item.key === key);

        if (target && target.z !== topZ) {
            update(key, { z: ++topZ });
        }
    }

    function save(key: string, viewer: WindowSize) {
        const item = windows.value.find((entry) => entry.key === key);

        if (item) {
            writeStored(item, compact.value, viewer);
        }
    }

    /** Opponent HUD sits at the top, so its window opens below the button; yours opens above. */
    function anchoredPoint(anchor: HTMLElement, side: ZoneWindowSide, size: WindowSize): WindowPoint & { anchorBottom: number | null } {
        const bounds = root.value!.getBoundingClientRect();
        const target = anchor.getBoundingClientRect();
        const cascade = windows.value.length * CASCADE_PX;
        const left = target.right - bounds.left - size.width + cascade;
        const top =
            side === 'opponent'
                ? target.bottom - bounds.top + ANCHOR_GAP_PX + cascade
                : target.top - bounds.top - ANCHOR_GAP_PX - size.height - cascade;

        return { left, top, anchorBottom: side === 'you' ? top + size.height : null };
    }

    function toggle(player: number, zone: ReplayZone, side: ZoneWindowSide, anchor: HTMLElement) {
        const existing = windows.value.find((item) => item.player === player && item.zone === zone);

        if (existing) {
            close(existing.key);

            return;
        }

        const viewer = viewerSize();

        if (!viewer) {
            return;
        }

        const stored = readStored(side, zone, compact.value);
        const storedSize = stored?.width && stored.height ? { width: stored.width, height: stored.height } : null;
        const placed = storedSize ?? defaultSize(viewer);
        const anchored = stored ? null : anchoredPoint(anchor, side, placed);
        const point = clampWindow(anchored ?? fromStoredPosition(stored!, viewer), placed, viewer);
        const size = storedSize ? clampSize(storedSize, point, MIN_SIZE, viewer) : null;

        windows.value = [
            ...windows.value,
            { key: `${player}:${zone}`, player, side, zone, ...point, size, anchorBottom: anchored?.anchorBottom ?? null, z: ++topZ },
        ];
    }

    /**
     * Re-places a window once it has rendered and its height is real: one
     * that opened upward keeps its bottom on the anchor, and any window that
     * turned out taller than assumed is pulled back inside the viewer.
     */
    function settle(key: string, element: HTMLElement) {
        const target = windows.value.find((item) => item.key === key);
        const viewer = viewerSize();

        if (!target || !viewer) {
            return;
        }

        const size = { width: element.offsetWidth, height: element.offsetHeight };
        const top = target.anchorBottom !== null ? target.anchorBottom - size.height : target.top;

        update(key, { ...clampWindow({ left: target.left, top }, size, viewer), anchorBottom: null });
    }

    /** Drags by the title bar; the position is saved once the pointer lets go. */
    function startDrag(key: string, event: PointerEvent, element: HTMLElement) {
        const target = windows.value.find((item) => item.key === key);
        const viewer = viewerSize();

        if (!target || !viewer || event.button !== 0) {
            return;
        }

        focus(key);

        const size = { width: element.offsetWidth, height: element.offsetHeight };

        trackPointer(
            event,
            (dx, dy) => update(key, { ...clampWindow({ left: target.left + dx, top: target.top + dy }, size, viewer), anchorBottom: null }),
            () => save(key, viewer),
        );
    }

    /** Resizes from the corner grip; the size is saved with the position. */
    function startResize(key: string, event: PointerEvent, element: HTMLElement) {
        const target = windows.value.find((item) => item.key === key);
        const viewer = viewerSize();

        if (!target || !viewer || event.button !== 0) {
            return;
        }

        event.stopPropagation();
        focus(key);

        const start = { width: element.offsetWidth, height: element.offsetHeight };

        trackPointer(
            event,
            (dx, dy) => update(key, { size: clampSize({ width: start.width + dx, height: start.height + dy }, target, MIN_SIZE, viewer) }),
            () => save(key, viewer),
        );
    }

    return { windows: readonly(windows), isOpen, toggle, close, closeTop, closeAll, focus, settle, startDrag, startResize };
}
