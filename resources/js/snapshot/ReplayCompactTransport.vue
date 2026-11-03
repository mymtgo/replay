<script setup lang="ts">
import { ChevronLeft, ChevronRight, Ellipsis, GitCommitHorizontal, Hand, Pause, Play, ScrollText, Share2, SkipBack, SkipForward } from 'lucide-vue-next';
import { shallowRef } from 'vue';

defineProps<{
    playing: boolean;
    /** Which of the bar's sheets is open, to light its button. */
    openSheet: 'hands' | 'timeline' | null;
    /** Landscape phones are short, so the bar slims down. */
    slim: boolean;
    /** Whether the host can link to a moment. */
    shareable: boolean;
}>();

const emit = defineEmits<{
    toggle: [];
    step: [delta: number];
    jumpTurn: [direction: -1 | 1];
    openSheet: [kind: 'hands' | 'timeline'];
    toggleLog: [];
    share: [];
}>();

const menuOpen = shallowRef(false);

function openLog() {
    menuOpen.value = false;
    emit('toggleLog');
}

function share() {
    menuOpen.value = false;
    emit('share');
}

const iconButton = 'grid size-9 flex-none cursor-pointer place-items-center rounded-md active:bg-accent';
</script>

<template>
    <div class="relative flex-none px-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <div
            class="flex items-center gap-0.5 rounded-md border border-white/5 bg-black/40 px-1 outline-1 outline-black/60"
            :class="slim ? 'h-11' : 'h-13'"
        >
            <button type="button" title="Previous turn" :class="iconButton" @click="emit('jumpTurn', -1)"><SkipBack :size="16" /></button>
            <button type="button" title="Step back" :class="iconButton" @click="emit('step', -1)"><ChevronLeft :size="19" /></button>
            <button
                type="button"
                title="Play / pause"
                class="grid size-10 flex-none cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground"
                @click="emit('toggle')"
            >
                <Pause v-if="playing" :size="16" fill="currentColor" :stroke-width="0" />
                <Play v-else :size="16" fill="currentColor" :stroke-width="0" class="ml-0.5" />
            </button>
            <button type="button" title="Step forward" :class="iconButton" @click="emit('step', 1)"><ChevronRight :size="19" /></button>
            <button type="button" title="Next turn" :class="iconButton" @click="emit('jumpTurn', 1)"><SkipForward :size="16" /></button>

            <div class="min-w-0 flex-1" />

            <button type="button" title="Hands" :class="[iconButton, openSheet === 'hands' ? 'bg-accent' : '']" @click="emit('openSheet', 'hands')">
                <Hand :size="18" :class="openSheet === 'hands' ? 'replay-glow' : ''" />
            </button>
            <button
                type="button"
                title="Timeline"
                :class="[iconButton, openSheet === 'timeline' ? 'bg-accent' : '']"
                @click="emit('openSheet', 'timeline')"
            >
                <GitCommitHorizontal :size="18" :class="openSheet === 'timeline' ? 'replay-glow' : ''" />
            </button>
            <button
                type="button"
                title="More"
                :aria-expanded="menuOpen"
                :class="[iconButton, menuOpen ? 'bg-accent' : '']"
                @click="menuOpen = !menuOpen"
            >
                <Ellipsis :size="18" />
            </button>
        </div>

        <template v-if="menuOpen">
            <div class="fixed inset-0 z-60" @click="menuOpen = false" />
            <div
                class="absolute right-1.5 bottom-full z-61 mb-1.5 flex min-w-48 flex-col overflow-hidden rounded-lg border border-border bg-card py-1 shadow-[0_10px_30px_rgba(0,0,0,.4)]"
                @click="menuOpen = false"
            >
                <button type="button" class="flex h-10 cursor-pointer items-center gap-2.5 px-3.5 text-left active:bg-accent" @click.stop="openLog">
                    <ScrollText :size="16" class="text-muted-foreground" />
                    Game log
                </button>
                <button
                    v-if="shareable"
                    type="button"
                    class="flex h-10 cursor-pointer items-center gap-2.5 px-3.5 text-left active:bg-accent"
                    @click.stop="share"
                >
                    <Share2 :size="16" class="text-muted-foreground" />
                    Share this moment
                </button>
                <slot name="menu" />
            </div>
        </template>
    </div>
</template>
