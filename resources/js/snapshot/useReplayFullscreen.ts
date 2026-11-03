import { onMounted, onUnmounted, readonly, shallowRef, type Ref } from 'vue';

/**
 * Puts the viewer itself into fullscreen, dropping the host's chrome so the
 * board gets the whole screen. Support is read after mount so server
 * rendering never touches `document`.
 */
export function useReplayFullscreen(root: Readonly<Ref<HTMLElement | null>>) {
    const supported = shallowRef(false);
    const active = shallowRef(false);

    function sync() {
        active.value = document.fullscreenElement !== null && document.fullscreenElement === root.value;
    }

    function toggle() {
        if (!supported.value) {
            return;
        }

        if (document.fullscreenElement) {
            void document.exitFullscreen();

            return;
        }

        root.value?.requestFullscreen().catch(() => {});
    }

    onMounted(() => {
        supported.value = document.fullscreenEnabled === true;
        document.addEventListener('fullscreenchange', sync);
    });

    onUnmounted(() => document.removeEventListener('fullscreenchange', sync));

    return { supported: readonly(supported), active: readonly(active), toggle };
}
