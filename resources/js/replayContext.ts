import { inject, type Component, type InjectionKey } from 'vue';
import type { ReplayCard } from './types';

/** Hooks and host wiring shared by every surface in the viewer. */
export type ReplayContext = {
    showPreview: (event: MouseEvent, card: ReplayCard) => void;
    hidePreview: () => void;
    /** URL of another game in the match; null when the host has no per-game pages. */
    gameHref: ((id: number) => string) | null;
    /** Element or component that renders game links, so a host can keep in-app navigation. */
    linkComponent: Component | string;
};

export const replayContextKey: InjectionKey<ReplayContext> = Symbol('replay');

export function useReplayContext(): ReplayContext {
    const context = inject(replayContextKey);

    if (!context) {
        throw new Error('Replay components must be rendered inside ReplayViewer.');
    }

    return context;
}
