import { onMounted, onUnmounted } from 'vue';

export type ReplayKeyboardActions = {
    toggle: () => void;
    step: (delta: number) => void;
    jumpTurn: (direction: -1 | 1) => void;
    toggleLog: () => void;
    toggleFullscreen: () => void;
    dismiss: () => void;
};

/** Space play/pause, arrows step, Shift+arrows jump turns, L log, F fullscreen, Escape closes overlays. */
export function useReplayKeyboard(actions: ReplayKeyboardActions) {
    function onKeydown(event: KeyboardEvent) {
        if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) {
            return;
        }

        // A host dialog over the viewer (sharing, for one) owns the keyboard
        // while it is open: arrows must not scrub the replay behind it.
        if (document.querySelector('[role="dialog"][aria-modal="true"], [role="dialog"][data-state="open"], [role="alertdialog"]')) {
            return;
        }

        switch (event.key) {
            case ' ':
                event.preventDefault();
                actions.toggle();
                break;
            case 'ArrowRight':
            case 'ArrowLeft': {
                event.preventDefault();
                const direction = event.key === 'ArrowRight' ? 1 : -1;

                if (event.shiftKey) {
                    actions.jumpTurn(direction);
                } else {
                    actions.step(direction);
                }

                break;
            }
            case 'l':
            case 'L':
                actions.toggleLog();
                break;
            case 'f':
            case 'F':
                actions.toggleFullscreen();
                break;
            case 'Escape':
                actions.dismiss();
                break;
        }
    }

    onMounted(() => window.addEventListener('keydown', onKeydown));
    onUnmounted(() => window.removeEventListener('keydown', onKeydown));
}
