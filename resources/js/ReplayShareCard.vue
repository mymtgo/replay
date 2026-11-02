<script setup lang="ts">
import { Check, Link2 } from 'lucide-vue-next';
import ReplayPanel from './ui/ReplayPanel.vue';

defineProps<{
    /** Where the game is, such as "PlayerA · Turn 3 · Combat"; null before turn 1. */
    moment: string | null;
    copied: boolean;
}>();

const emit = defineEmits<{
    share: [];
}>();
</script>

<template>
    <ReplayPanel class="w-60 gap-2.5 p-3">
        <div>
            <div class="font-medium">Share this moment</div>
            <div class="text-muted-foreground">{{ moment ?? 'Before the first turn' }}</div>
        </div>
        <button
            type="button"
            class="flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md bg-accent px-3 hover:bg-accent/80"
            @click="emit('share')"
        >
            <Check v-if="copied" :size="15" />
            <Link2 v-else :size="15" />
            {{ copied ? 'Link copied' : 'Copy link' }}
        </button>
    </ReplayPanel>
</template>
