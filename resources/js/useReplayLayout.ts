import { computed, onMounted, onUnmounted, readonly, shallowRef, type Ref } from 'vue';
import { replayLayoutFor, type ReplayLayout } from './replayLayout';

/**
 * Which layout the viewer's own size calls for. Measured with a
 * ResizeObserver because the landscape phone case needs the height, which
 * Tailwind's inline-size container queries cannot see.
 */
export function useReplayLayout(root: Readonly<Ref<HTMLElement | null>>) {
    const layout = shallowRef<ReplayLayout>('regular');
    let observer: ResizeObserver | null = null;

    onMounted(() => {
        if (!root.value || typeof ResizeObserver === 'undefined') {
            return;
        }

        observer = new ResizeObserver(([entry]) => {
            layout.value = replayLayoutFor(entry.contentRect.width, entry.contentRect.height);
        });
        observer.observe(root.value);
    });

    onUnmounted(() => observer?.disconnect());

    const compact = computed(() => layout.value !== 'regular');

    return { layout: readonly(layout), compact };
}
