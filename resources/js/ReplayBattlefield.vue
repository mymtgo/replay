<script setup lang="ts">
import { computed } from 'vue';
import ReplayCardPile from './ReplayCardPile.vue';
import ReplayCardTile from './ReplayCardTile.vue';
import { emptyRowWeight, rowWeight } from './replayBoardFit';
import { joinGroups, type RowItem, type SideRows } from './replayRows';
import type { ReplayCardView } from './types';

const props = defineProps<{
    rows: SideRows;
    opponent: boolean;
    pairs: Map<string, number>;
    /** Cards under a permanent, by the host's key. */
    tucked: ReadonlyMap<string, ReplayCardView[]>;
    /**
     * Compact viewers keep cards at a readable height and let a crowded row
     * scroll sideways instead of shrinking and overlapping its cards.
     */
    scroll: boolean;
    /** Creatures and the rest share one row, as on landscape phones. */
    singleRow?: boolean;
}>();

type DrawnRow = { key: string; items: RowItem[]; weight: number; lift: number; /** Indexes of the items that start a group after the first, which get a little room before them. */ spacers: number[] };

/**
 * Two fixed rows: creatures face the centre line, and lands and other
 * permanents sit behind them, toward the player's own edge. Both rows span the
 * whole area and stay a card tall when empty, so nothing moves when a creature
 * arrives. A phone's empty row only keeps part of a card.
 */
const drawn = computed<DrawnRow[]>(() => {
    const { front, back, lands } = props.rows;
    const row = (key: string, groups: RowItem[][]): DrawnRow => {
        const { items, spacers } = joinGroups(groups);

        return { key, items, weight: rowWeight(items, emptyRowWeight(props.scroll)), lift: items.length ? rowWeight(items, 0) - 1 : 0, spacers };
    };

    if (props.singleRow) {
        return [row('all', [front, back, lands])];
    }

    return props.opponent ? [row('back', [back, lands]), row('front', [front])] : [row('front', [front]), row('back', [back, lands])];
});

/** Height around a row's cards: the padding the layout gives it. */
const rowPad = computed(() => (props.scroll ? (props.singleRow ? '1.25rem' : '2rem') : '0.875rem'));
</script>

<template>
    <!--
        Rows are one shared card height (useReplayBoardFit sizes it to fit),
        and what is left over gathers on the far side so the cards stay near
        the centre line.
    -->
    <div data-replay-field class="flex min-h-0 min-w-0 flex-1 basis-0 flex-col py-1" :class="opponent ? 'justify-end' : 'justify-start'">
        <div
            v-for="row in drawn"
            :key="row.key"
            data-replay-row
            :data-weight="row.weight"
            class="flex flex-none items-stretch gap-1.5 [&>*]:mt-[calc(var(--replay-card-h)*var(--replay-lift))]"
            :style="{ height: `calc(var(--replay-card-h) * ${row.weight} + ${rowPad})`, '--replay-lift': row.lift }"
            :class="
                scroll
                    ? [
                          'justify-center-safe overflow-x-auto overflow-y-hidden px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                          singleRow ? 'py-2.5' : 'py-4',
                      ]
                    : 'justify-center-safe px-2 py-1.75'
            "
        >
            <template v-for="(item, i) in row.items" :key="item.key">
                <ReplayCardPile v-if="item.pile" :class="row.spacers.includes(i) ? 'ml-2.5' : ''" :pile="item.pile" :opponent="opponent" :tucked="tucked" />
                <ReplayCardTile
                    v-else
                    :class="row.spacers.includes(i) ? 'ml-2.5' : ''"
                    :card="item.group.card"
                    :represents="item.group.members"
                    :count="item.group.count"
                    :opponent="opponent"
                    :pair="pairs.get(item.group.card.key) ?? null"
                    :under="tucked.get(item.group.card.key)"
                    :last="scroll || i === row.items.length - 1"
                />
            </template>
        </div>
    </div>
</template>
