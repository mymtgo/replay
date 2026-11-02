<script setup lang="ts">
import { shallowRef, watch } from 'vue';
import ReplayCardBack from './ReplayCardBack.vue';

const props = defineProps<{
    /** Null for a card nobody has seen, which shows its back. */
    name?: string | null;
    /** A line under the name on the fallback face: ability text, a type, a note. */
    subtitle?: string | null;
    image?: string | null;
}>();

const failed = shallowRef(false);

watch(
    () => props.image,
    () => {
        failed.value = false;
    },
);
</script>

<template>
    <ReplayCardBack v-if="name === null" />
    <div v-else class="absolute inset-0 overflow-hidden rounded-[inherit] bg-linear-160 from-[#3b3a35] to-[#23221f]">
        <div class="absolute inset-0 flex flex-col justify-between p-[8%] text-[10px] leading-tight text-[#eee]">
            <span class="font-semibold">{{ name ?? 'Unknown card' }}</span>
            <span v-if="subtitle" class="line-clamp-4 text-[9px] text-[#cfcfcf]">{{ subtitle }}</span>
        </div>
        <img
            v-if="image && !failed"
            :src="image"
            :alt="name ?? 'card'"
            draggable="false"
            class="absolute inset-0 block size-full object-cover"
            @error="failed = true"
        />
    </div>
</template>
