<script setup lang="ts">
import { computed } from 'vue';
import ReplayCardImage from './ReplayCardImage.vue';
import { previewFaces } from './replayCards';
import { useReplayContext } from './replayContext';
import type { CardPreviewPosition, ReplayCardView } from './types';
import { FACE_GAP_PX } from './useCardPreview';

const props = defineProps<{
    card: ReplayCardView;
    chips: string[];
    position: CardPreviewPosition;
    /** Opened by a tap: it takes input so a tap anywhere closes it. */
    pinned?: boolean;
}>();

const emit = defineEmits<{
    close: [];
}>();

const { images } = useReplayContext();

const faces = computed(() => previewFaces(props.card, images));
const width = computed(() => props.position.width * faces.value.length + FACE_GAP_PX * (faces.value.length - 1));
/** An ability borrows its source's picture, so the name on the fallback face is the source's. */
const name = computed(() => props.card.name ?? props.card.sourceName);
</script>

<template>
    <div class="contents">
        <div v-if="pinned" class="absolute inset-0 z-89 bg-black/60" @click.stop="emit('close')" />
        <div
            class="absolute z-90 flex flex-col gap-1.5"
            :class="pinned ? '' : 'pointer-events-none'"
            @click.stop="emit('close')"
            :style="{ left: `${position.left}px`, top: `${position.top}px`, width: `${width}px` }"
        >
            <div class="flex" :style="{ gap: `${FACE_GAP_PX}px` }">
                <div
                    v-for="(image, i) in faces"
                    :key="i"
                    class="relative aspect-[63/88] min-w-0 flex-1 rounded-[4.5%/3.3%] shadow-[0_14px_40px_rgba(0,0,0,.55)]"
                >
                    <ReplayCardImage :name="name" :subtitle="card.text" :image="image" />
                </div>
            </div>
            <div v-if="card.text && card.kind === 'ability'" class="rounded-[5px] border border-border bg-card px-2 py-1 text-[11.5px] leading-snug">{{ card.text }}</div>
            <div v-if="chips.length" class="flex flex-wrap gap-1">
                <span
                    v-for="chip in chips"
                    :key="chip"
                    class="rounded-[5px] border border-border bg-card px-1.75 py-0.75 text-[11.5px] font-semibold shadow-[0_2px_8px_rgba(0,0,0,.25)]"
                >
                    {{ chip }}
                </span>
            </div>
        </div>
    </div>
</template>
