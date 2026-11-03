<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { shallowRef } from 'vue';

defineProps<{
    title: string;
    /** Shown beside the title; null hides it. */
    count?: number | null;
    /** Landscape phones have little height, so the sheet may take more of it. */
    landscape: boolean;
}>();

const emit = defineEmits<{
    close: [];
}>();

/** A downward swipe past this closes the sheet. */
const CLOSE_DRAG_PX = 80;

const offset = shallowRef(0);
let startY: number | null = null;

function onPointerDown(event: PointerEvent) {
    startY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
    if (startY !== null) {
        offset.value = Math.max(0, event.clientY - startY);
    }
}

function onPointerUp() {
    const close = offset.value > CLOSE_DRAG_PX;

    startY = null;
    offset.value = 0;

    if (close) {
        emit('close');
    }
}
</script>

<template>
    <div class="absolute inset-0 z-70">
        <div class="replay-sheet-backdrop absolute inset-0 bg-black/50" @click="emit('close')" />
        <section
            role="dialog"
            :aria-label="title"
            class="replay-sheet absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgba(0,0,0,.4)]"
            :class="[landscape ? 'max-h-[85%]' : 'max-h-[60%]', offset ? 'transition-none' : 'transition-transform']"
            :style="{ transform: `translateY(${offset}px)` }"
        >
            <div
                class="flex-none touch-none"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerUp"
            >
                <div aria-hidden="true" class="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" />
                <div class="flex items-center gap-2 py-1.5 pr-2 pl-4">
                    <span class="truncate font-semibold">{{ title }}</span>
                    <span v-if="count != null" class="text-muted-foreground tabular-nums">{{ count }}</span>
                    <div class="flex-1" />
                    <button
                        type="button"
                        title="Close"
                        class="grid size-9 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                        @pointerdown.stop
                        @click="emit('close')"
                    >
                        <X :size="18" />
                    </button>
                </div>
            </div>
            <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
                <slot />
            </div>
        </section>
    </div>
</template>
