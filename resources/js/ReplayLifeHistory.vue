<script setup lang="ts">
import { ChevronDown, Heart } from 'lucide-vue-next';
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue';
import { useReplayContext } from './replayContext';
import type { ReplayPlayerView } from './types';
import ReplayPanel from './ui/ReplayPanel.vue';

/**
 * The life total as a button: hovering it, or clicking or tapping it, opens
 * the player's life changes so far. A click keeps it open until the next
 * click, a click elsewhere, or Escape.
 */
const props = defineProps<{
    player: ReplayPlayerView;
    /** The opponent's HUD sits at the top of the board, so its panel opens downward. */
    opponent: boolean;
    compact?: boolean;
}>();

const { lifeHistory } = useReplayContext();

const changes = computed(() => lifeHistory(props.player.id));
const start = computed(() => changes.value[0]?.old ?? props.player.life);

const button = useTemplateRef<HTMLElement>('button');
const panel = useTemplateRef<HTMLElement>('panel');
const hovered = shallowRef(false);
const pinned = shallowRef(false);
const open = computed(() => hovered.value || pinned.value);
const PANEL_WIDTH_PX = 256;
const EDGE_PX = 8;
const place = shallowRef<{ left: number; top?: number; bottom?: number }>({ left: 0 });

/** Fixed to the viewport, so the HUD column's scrolling never clips it. */
function measure() {
    const rect = button.value?.getBoundingClientRect();

    if (!rect) {
        return;
    }

    const left = Math.max(EDGE_PX, Math.min(rect.left, window.innerWidth - PANEL_WIDTH_PX - EDGE_PX));

    place.value = props.opponent ? { left, top: rect.bottom + 6 } : { left, bottom: window.innerHeight - rect.top + 6 };
}

function enter(event: PointerEvent) {
    if (event.pointerType === 'mouse') {
        measure();
        hovered.value = true;
    }
}

function toggle() {
    measure();
    pinned.value = !pinned.value;
}

function dismiss(event: Event) {
    if (event instanceof KeyboardEvent ? event.key === 'Escape' : !button.value?.contains(event.target as Node) && !panel.value?.contains(event.target as Node)) {
        pinned.value = false;
    }
}

watch(pinned, (value) => {
    const method = value ? 'addEventListener' : 'removeEventListener';

    document[method]('pointerdown', dismiss);
    document[method]('keydown', dismiss);
});

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', dismiss);
    document.removeEventListener('keydown', dismiss);
});

/** The dot of whoever's turn it was, in their colour: you are --primary, the opponent theirs. */
function turnDot(active: string): string {
    const isThisPlayer = active === props.player.id;
    const local = isThisPlayer ? props.player.local : !props.player.local;

    return local ? 'bg-primary' : 'bg-(--replay-opponent)';
}

const delta = (value: number) => (value > 0 ? `+${value}` : `${value}`);
</script>

<template>
    <button
        ref="button"
        type="button"
        title="Life history"
        :aria-expanded="open"
        class="replay-texture-bg inline-flex flex-none cursor-pointer items-center rounded-md border border-[#e5484d]/45 shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:border-[#e5484d]/80"
        :class="[compact ? 'h-6 gap-1 px-1.5' : 'h-7.5 gap-1.25 px-2', open ? 'border-[#e5484d]/80' : '']"
        @pointerenter="enter"
        @pointerleave="hovered = false"
        @click="toggle"
    >
        <Heart :size="compact ? 13 : 15" class="text-[#e5484d]" />
        <span class="min-w-[2ch] font-bold tabular-nums" :class="[compact ? 'text-[15px]' : 'text-[17px]', player.life <= 5 ? 'text-[#e5484d]' : '']">{{ player.life }}</span>
        <ChevronDown :size="12" class="text-muted-foreground transition-transform" :class="open ? 'rotate-180' : ''" />
    </button>

    <div
        v-if="open"
        ref="panel"
        class="replay-texture-bg fixed z-70 rounded-md shadow-[0_14px_40px_rgba(0,0,0,0.6)]"
        :style="{ width: `${PANEL_WIDTH_PX}px`, left: `${place.left}px`, top: place.top != null ? `${place.top}px` : undefined, bottom: place.bottom != null ? `${place.bottom}px` : undefined }"
    >
        <ReplayPanel class="max-h-72 gap-1.5 overflow-y-auto px-3 py-2.5 text-xs">
            <div class="flex items-center justify-between font-semibold">
                <span>{{ player.name }}'s life</span>
                <span class="text-muted-foreground tabular-nums">started at {{ start }}</span>
            </div>
            <p v-if="!changes.length" class="py-1 text-muted-foreground">No changes yet.</p>
            <ol v-else class="flex flex-col gap-1">
                <li v-for="(change, i) in changes" :key="i" class="flex items-baseline gap-2">
                    <span class="flex w-8 flex-none items-center gap-1 text-muted-foreground tabular-nums" :title="change.activePlayer ? `${change.activePlayer}'s turn ${change.turn}` : 'Before the first turn'">
                        <span v-if="change.activePlayer" class="size-1.5 rounded-full" :class="turnDot(change.activePlayer)" />
                        {{ change.turn !== null ? `T${change.turn}` : 'Pre' }}
                    </span>
                    <span class="w-7 flex-none text-right font-semibold tabular-nums" :class="change.new < change.old ? 'text-[#e5484d]' : 'text-[#4fb883]'">{{ delta(change.new - change.old) }}</span>
                    <span class="w-6 flex-none text-right font-bold tabular-nums">{{ change.new }}</span>
                    <span class="min-w-0 truncate text-muted-foreground" :title="change.cause ?? undefined">{{ change.cause ?? '' }}</span>
                </li>
            </ol>
        </ReplayPanel>
    </div>
</template>
