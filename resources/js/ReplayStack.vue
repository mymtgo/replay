<script setup lang="ts">
import { ArrowDown, ArrowUp, Crosshair } from 'lucide-vue-next';
import ReplayCardImage from './ReplayCardImage.vue';
import { useReplayContext } from './replayContext';
import ReplayPanel from './ui/ReplayPanel.vue';
import type { ReplayStackItem } from './types';

/** Stack items, top of the stack first, each with its targets and the choices made for it. */
defineProps<{
    items: ReplayStackItem[];
}>();

const { showPreview, hidePreview, pinPreview } = useReplayContext();

const KIND_LABELS: Record<string, string> = { ability: 'Ability', copy: 'Copy', token: 'Token' };
</script>

<template>
    <!-- Opaque backing so the board never shows through the floating list. -->
    <div class="replay-texture-bg relative flex max-h-full w-64 max-w-full flex-none rounded-md">
        <ReplayPanel class="max-h-full min-w-0 flex-1 gap-2 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            <div class="flex items-baseline gap-1.5 text-[11px] leading-tight">
                <span class="font-semibold">Stack</span>
                <span class="text-muted-foreground tabular-nums">{{ items.length }}</span>
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
                        class="flex min-h-0 flex-col gap-1 overflow-y-auto"
                        enter-active-class="transition duration-200 ease-out"
                        enter-from-class="-translate-y-2 opacity-0"
                        leave-active-class="transition duration-150 ease-in"
                        leave-to-class="translate-x-3 opacity-0"
                    >
                        <li
                            v-for="(item, i) in items"
                            :key="item.card.key"
                            class="flex items-start gap-2 rounded-md px-1 py-1"
                            :class="i === 0 ? 'bg-white/5' : ''"
                            @mouseenter="showPreview($event, item.card)"
                            @mouseleave="hidePreview"
                            @click="pinPreview($event, item.card)"
                        >
                            <div class="relative aspect-[63/88] w-8 flex-none overflow-hidden rounded-[3px] shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                                <ReplayCardImage :name="item.title" :image="item.card.image" />
                            </div>
                            <div class="flex min-w-0 flex-col gap-0.5">
                                <span class="flex items-baseline gap-1">
                                    <span class="truncate font-semibold">{{ item.title }}</span>
                                    <span v-if="KIND_LABELS[item.card.kind]" class="flex-none text-[10px] text-muted-foreground uppercase">{{ KIND_LABELS[item.card.kind] }}</span>
                                </span>
                                <span class="truncate text-[11px] text-muted-foreground">{{ item.controller }}</span>
                                <span v-if="item.text" class="line-clamp-3 text-[11px] leading-snug text-foreground/80">{{ item.text }}</span>
                                <span v-for="target in item.targets" :key="target" class="flex items-center gap-1 text-[11px]">
                                    <Crosshair :size="11" class="flex-none text-[#e5484d]" />
                                    <span class="truncate">{{ target }}</span>
                                </span>
                                <span v-if="item.choices.length" class="truncate text-[11px] text-muted-foreground">{{ item.choices.join(' · ') }}</span>
                            </div>
                        </li>
                    </TransitionGroup>

                    <span v-if="items.length > 1" class="text-[11px] leading-tight text-muted-foreground">Last to resolve</span>
                </div>
            </div>
        </ReplayPanel>
    </div>
</template>
