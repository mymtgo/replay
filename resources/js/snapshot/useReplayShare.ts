import { onUnmounted, shallowRef } from 'vue';

const COPIED_MS = 2000;

/**
 * Hands over a link to the moment being watched. Phones get the system share
 * sheet where there is one; everywhere else, or when the sheet is refused,
 * the link goes to the clipboard and `copied` lights for a moment.
 */
export function useReplayShare(link: () => string | null) {
    const copied = shallowRef(false);
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function share(native: boolean) {
        const url = link();

        if (!url) {
            return;
        }

        if (native && typeof navigator.share === 'function') {
            try {
                await navigator.share({ url });

                return;
            } catch (error) {
                // Dismissing the sheet is a choice, not a failure to fall back from.
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }
            }
        }

        try {
            await navigator.clipboard.writeText(url);
        } catch {
            return;
        }

        copied.value = true;

        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => (copied.value = false), COPIED_MS);
    }

    onUnmounted(() => {
        if (timer) {
            clearTimeout(timer);
        }
    });

    return { copied, share };
}
