<script setup lang="ts">
import { useReplayContext } from './replayContext';
import type { SideboardChanges } from './replaySideboard';

/**
 * What you sided in and out for this game, against the game before it,
 * under the sideboard's own list.
 */
defineProps<{
    /** The game compared against. */
    game: number;
    changes: SideboardChanges;
    small?: boolean;
}>();

const { showPreview, hidePreview, pinPreview } = useReplayContext();

const GROUPS = [
    { key: 'in', label: 'Brought in', sign: '+', tone: 'text-[#4fb883]' },
    { key: 'out', label: 'Taken out', sign: '−', tone: 'text-[#e5484d]' },
] as const;
</script>

<template>
    <div class="flex max-h-[45%] flex-none flex-col overflow-y-auto border-t border-border bg-background/40 px-3" :class="small ? 'py-1.5' : 'py-2'">
        <div class="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Changes from game {{ game }}</div>
        <div v-if="!changes.in.length && !changes.out.length" class="py-1.5 text-muted-foreground">No changes</div>
        <template v-for="group in GROUPS" :key="group.key">
            <div v-if="changes[group.key].length" class="mt-1.5">
                <div class="text-[11px] text-muted-foreground">{{ group.label }}</div>
                <ul>
                    <li
                        v-for="line in changes[group.key]"
                        :key="line.key"
                        class="flex cursor-default items-baseline gap-2 rounded px-1 hover:bg-accent/50"
                        :class="small ? 'py-1' : 'py-0.5'"
                        @mouseenter="showPreview($event, line.card)"
                        @mouseleave="hidePreview"
                        @click="pinPreview($event, line.card)"
                    >
                        <span class="w-6 flex-none font-semibold tabular-nums" :class="group.tone">{{ group.sign }}{{ line.count }}</span>
                        <span class="truncate font-medium">{{ line.name ?? 'Unknown card' }}</span>
                    </li>
                </ul>
            </div>
        </template>
    </div>
</template>
