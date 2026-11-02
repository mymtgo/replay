import { inject, type Component, type InjectionKey } from 'vue';
import type { Ref } from 'vue';
import type { TargetMarks } from './replayTargets';
import type { CardImageResolver, ReplayCardView } from './types';

/** Hooks and host wiring shared by every surface in the viewer. */
export type ReplayContext = {
    showPreview: (event: MouseEvent, card: ReplayCardView) => void;
    hidePreview: () => void;
    /** Opens the preview from a tap; mouse clicks are ignored, since hover already shows it. */
    pinPreview: (event: MouseEvent, card: ReplayCardView) => void;
    /** The object with this key at the current moment, for surfaces that hold only a key. */
    cardByKey: (key: string) => ReplayCardView | null;
    /** Keys the board marks as targets of the stack entry being pointed at, focused or pinned; see `replayTargets`. */
    highlightedTargets: Readonly<Ref<TargetMarks>>;
    /** The stack entry pinned by a tap, if any. */
    pinnedStack: Readonly<Ref<string | null>>;
    /** Point at a stack entry, or at one of its target lines; `leaveStack` clears it. */
    pointStack: (key: string, target?: number | null) => void;
    leaveStack: () => void;
    focusStack: (key: string) => void;
    blurStack: (key: string) => void;
    togglePinStack: (key: string, viaKeyboard?: boolean) => void;
    /** The host's card images. */
    images: CardImageResolver;
    /** URL of another game in the match by index; null when the host has no per-game pages. */
    gameHref: ((index: number) => string) | null;
    /** Element or component that renders game links, so a host can keep in-app navigation. */
    linkComponent: Component | string;
    /** Switches game in place by index. */
    selectGame: (index: number) => void;
};

export const replayContextKey: InjectionKey<ReplayContext> = Symbol('replay');

export function useReplayContext(): ReplayContext {
    const context = inject(replayContextKey);

    if (!context) {
        throw new Error('Replay components must be rendered inside ReplayViewer.');
    }

    return context;
}
