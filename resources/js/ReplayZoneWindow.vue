<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { onMounted, onUnmounted, useTemplateRef } from 'vue';
import ReplayHandCards from './ReplayHandCards.vue';
import ReplayZoneCards from './ReplayZoneCards.vue';
import type { WindowSize } from './replayWindows';
import type { ReplayCardView, ReplayZone } from './types';
import { COMPACT_ZONE_WINDOW_WIDTH_PX, ZONE_WINDOW_WIDTH_PX } from './useZoneWindows';

const props = defineProps<{
    title: string;
    zone: ReplayZone;
    cards: ReplayCardView[];
    captions?: Map<string, string> | null;
    left: number;
    top: number;
    /** Null until resized: default width, height fitting the cards. */
    size: WindowSize | null;
    z: number;
    compact: boolean;
    /** A hand's size and what is showing or choosing its cards; its window draws card images, backs for the unknown ones. */
    hand?: { count: number; revealed: ReadonlySet<string>; revealedBy: string | null; chosen: ReadonlySet<string> };
}>();

const emit = defineEmits<{
    close: [];
    focus: [];
    dragStart: [event: PointerEvent, element: HTMLElement];
    resizeStart: [event: PointerEvent, element: HTMLElement];
    /** Rendered, or fitted to different content: its real height can be used to place it. */
    mounted: [element: HTMLElement];
}>();

const panel = useTemplateRef<HTMLElement>('panel');

let observer: ResizeObserver | null = null;

onMounted(() => {
    if (!panel.value) {
        return;
    }

    emit('mounted', panel.value);

    /** Cards load and wrap after it opens, so a window that fits its content places itself again as it grows. */
    if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => !props.size && panel.value && emit('mounted', panel.value));
        observer.observe(panel.value);
    }
});

onUnmounted(() => observer?.disconnect());

</script>

<template>
    <!-- No backdrop: the board and playback stay usable while it is open. -->
    <div
        ref="panel"
        role="dialog"
        :aria-label="title"
        class="pointer-events-auto absolute flex flex-col overflow-hidden rounded-[10px] border border-border bg-card shadow-[0_10px_30px_rgba(0,0,0,.45)]"
        :class="size ? '' : compact ? 'max-h-[min(300px,50%)]' : 'max-h-[min(460px,75%)]'"
        :style="{
            left: `${left}px`,
            top: `${top}px`,
            width: size ? `${size.width}px` : `min(${compact ? COMPACT_ZONE_WINDOW_WIDTH_PX : ZONE_WINDOW_WIDTH_PX}px, calc(100% - 16px))`,
            height: size ? `${size.height}px` : undefined,
            zIndex: z,
        }"
        @pointerdown="emit('focus')"
    >
        <div
            class="flex flex-none cursor-grab touch-none items-center gap-2 border-b border-border pr-1.5 pl-3 active:cursor-grabbing"
            :class="compact ? 'py-1' : 'py-2'"
            data-zone-window-handle
            @pointerdown="panel && emit('dragStart', $event, panel)"
        >
            <span class="truncate font-semibold">{{ title }}</span>
            <span class="text-muted-foreground tabular-nums">{{ hand ? hand.count : cards.length }}</span>
            <div class="flex-1" />
            <button
                type="button"
                title="Close"
                class="grid cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                :class="compact ? 'size-8' : 'size-6.5'"
                @pointerdown.stop
                @click="emit('close')"
            >
                <X :size="15" />
            </button>
        </div>
        <ReplayHandCards v-if="hand" :cards="cards" :count="hand.count" :revealed="hand.revealed" :revealed-by="hand.revealedBy" :chosen="hand.chosen" />
        <ReplayZoneCards v-else :zone="zone" :cards="cards" :captions="captions" :small="compact" />
        <slot />

        <!-- Resize grip; a touch target on phones, a small corner on desktop. -->
        <div
            title="Resize"
            class="absolute right-0 bottom-0 z-1 flex cursor-nwse-resize touch-none items-end justify-end p-1 text-muted-foreground"
            :class="compact ? 'size-7' : 'size-4.5'"
            @pointerdown="panel && emit('resizeStart', $event, panel)"
        >
            <svg viewBox="0 0 8 8" class="size-2.5" aria-hidden="true"><path d="M7 1 1 7M7 4 4 7" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" /></svg>
        </div>
    </div>
</template>
