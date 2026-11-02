<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Crosshair, Layers, Quote } from 'lucide-vue-next';
import ReplayCardImage from './ReplayCardImage.vue';
import { useReplayContext } from './replayContext';
import ReplayPanel from './ui/ReplayPanel.vue';
import type { ReplayStackItem } from './types';

/**
 * Stack items, top of the stack first, each with its targets and the choices
 * made for it. It is a column of its own beside the board on wide viewers,
 * so the top entry gets large art and its full text; the entries beneath it
 * are smaller and clamp long text.
 */
defineProps<{
    items: ReplayStackItem[];
    /** Floating over the board, the stack can fold to a pill to show what is under it. */
    collapsible?: boolean;
    collapsed?: boolean;
}>();

const emit = defineEmits<{
    toggle: [];
}>();

const { showPreview, hidePreview, pinPreview, highlightedTargets, pinnedStack, pointStack, leaveStack, focusStack, blurStack, togglePinStack } = useReplayContext();

/** Only keyboard focus marks targets: a click also focuses the entry, and the marks must go when the mouse does. */
function onFocus(event: FocusEvent, key: string) {
    if ((event.currentTarget as HTMLElement).matches(':focus-visible')) {
        focusStack(key);
    }
}

/** An entry with targets pins them on a tap; one without keeps the tap for its card preview. */
function onTap(event: MouseEvent, item: ReplayStackItem) {
    if (item.targets.length) {
        togglePinStack(item.card.key);
    } else {
        pinPreview(event, item.card);
    }
}

const KIND_LABELS: Record<string, string> = { ability: 'Ability', copy: 'Copy', token: 'Token' };
</script>

<template>
    <button
        v-if="collapsible && collapsed"
        type="button"
        title="Show the stack"
        class="replay-texture-bg inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-primary/60 px-2.5 text-xs font-semibold shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
        @click="emit('toggle')"
    >
        <Layers :size="14" class="replay-glow" />
        <span>Stack</span>
        <span class="tabular-nums">{{ items.length }}</span>
        <ChevronDown :size="13" class="text-muted-foreground" />
    </button>
    <!-- Opaque backing so the board never shows through the panel. -->
    <div v-else class="replay-texture-bg relative flex max-h-full w-full flex-none rounded-md shadow-[0_14px_40px_rgba(0,0,0,0.6)]">
        <ReplayPanel class="max-h-full min-w-0 flex-1 gap-2 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            <div class="flex items-center gap-1.5 text-xs leading-tight">
                <span class="font-semibold">Stack</span>
                <span class="text-muted-foreground tabular-nums">{{ items.length }}</span>
                <button
                    v-if="collapsible"
                    type="button"
                    title="Hide the stack"
                    class="ml-auto grid size-6 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-accent/50"
                    @click="emit('toggle')"
                >
                    <ChevronUp :size="14" />
                </button>
            </div>

            <!-- Resolution order reads top to bottom; the arrow only earns its place with two or more. -->
            <div class="flex min-h-0 gap-2">
                <div v-if="items.length > 1" aria-hidden="true" class="flex flex-none flex-col items-center py-0.5 text-muted-foreground">
                    <ArrowUp :size="12" />
                    <div class="w-px flex-1 bg-white/15" />
                    <ArrowDown :size="12" />
                </div>

                <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
                    <span v-if="items.length > 1" class="text-[11px] leading-tight text-muted-foreground">First to resolve</span>

                    <TransitionGroup
                        tag="ol"
                        class="flex min-h-0 flex-col gap-1.5 overflow-y-auto"
                        enter-active-class="transition duration-200 ease-out"
                        enter-from-class="-translate-y-2 opacity-0"
                        leave-active-class="transition duration-150 ease-in"
                        leave-to-class="translate-x-3 opacity-0"
                    >
                        <li
                            v-for="(item, i) in items"
                            :key="item.card.key"
                            :data-stack-key="item.card.key"
                            :tabindex="item.targets.length ? 0 : undefined"
                            :aria-pressed="item.targets.length ? pinnedStack === item.card.key : undefined"
                            class="flex items-start gap-2.5 rounded-md p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            :class="[
                                i === 0 ? 'bg-white/5' : '',
                                item.targets.length ? 'cursor-pointer' : '',
                                highlightedTargets.has(item.card.key) ? 'ring-2 ring-[#e5484d]' : pinnedStack === item.card.key ? 'ring-1 ring-[#e5484d]/70' : '',
                            ]"
                            @mouseenter="showPreview($event, item.card); pointStack(item.card.key)"
                            @mouseleave="hidePreview(); leaveStack()"
                            @focus="onFocus($event, item.card.key)"
                            @blur="blurStack(item.card.key)"
                            @keydown.enter.stop.prevent="togglePinStack(item.card.key, true)"
                            @keydown.space.stop.prevent="togglePinStack(item.card.key, true)"
                            @click="onTap($event, item)"
                        >
                            <div
                                class="relative aspect-[63/88] flex-none overflow-hidden rounded-[5px] shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
                                :class="i === 0 ? 'w-28' : 'w-16'"
                                @click.stop="pinPreview($event, item.card)"
                            >
                                <ReplayCardImage :name="item.title" :image="item.card.image" />
                            </div>
                            <div class="flex min-w-0 flex-1 flex-col gap-1">
                                <span class="flex flex-wrap items-baseline gap-x-1.5">
                                    <span class="font-semibold" :class="i === 0 ? 'text-sm' : ''">{{ item.title }}</span>
                                    <span v-if="KIND_LABELS[item.card.kind]" class="flex-none text-[10px] text-muted-foreground uppercase">{{ KIND_LABELS[item.card.kind] }}</span>
                                </span>
                                <span class="text-[11px] text-muted-foreground">{{ item.controller }}</span>
                                <span v-if="item.text" class="text-xs leading-snug text-foreground/85" :class="i < 2 ? '' : 'line-clamp-4'">{{ item.text }}</span>
                                <span
                                    v-for="(target, n) in item.targets"
                                    :key="n"
                                    class="flex items-start gap-1.5 rounded text-xs"
                                    @mouseenter.stop="pointStack(item.card.key, n)"
                                    @mouseleave.stop="pointStack(item.card.key)"
                                >
                                    <Crosshair :size="12" class="mt-0.5 flex-none text-[#e5484d]" />
                                    <span>{{ target }}</span>
                                </span>
                                <span
                                    v-for="pick in item.chosen"
                                    :key="pick.name"
                                    data-stack-chosen
                                    class="flex items-center gap-1.5 rounded text-xs text-muted-foreground"
                                    @mouseenter.stop="pick.card && showPreview($event, pick.card)"
                                    @mouseleave.stop="hidePreview"
                                    @click.stop="pick.card && pinPreview($event, pick.card)"
                                >
                                    <Quote :size="11" class="flex-none" />
                                    <span v-if="pick.card?.image" class="relative aspect-[63/88] w-5 flex-none overflow-hidden rounded-[2px]">
                                        <ReplayCardImage :name="pick.name" :image="pick.card.image" />
                                    </span>
                                    <span>Chose <span class="text-foreground/90">{{ pick.name }}</span></span>
                                </span>
                                <span v-for="choice in item.choices" :key="choice" class="text-xs text-muted-foreground">{{ choice }}</span>
                            </div>
                        </li>
                    </TransitionGroup>

                    <span v-if="items.length > 1" class="text-[11px] leading-tight text-muted-foreground">Last to resolve</span>
                </div>
            </div>
        </ReplayPanel>
    </div>
</template>
