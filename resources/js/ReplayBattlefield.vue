<script setup lang="ts">
import { computed } from 'vue';
import ReplayCardPile from './ReplayCardPile.vue';
import ReplayCardTile from './ReplayCardTile.vue';
import { frontRowGroups, isFrontRow, landPiles, type CardGroup, type LandPile } from './replayCards';
import type { ReplayCardView } from './types';

const props = defineProps<{
    battlefield: ReplayCardView[];
    opponent: boolean;
    pairs: Map<string, number>;
    /** Cards under a permanent, by the host's key. */
    tucked: ReadonlyMap<string, ReplayCardView[]>;
    /**
     * Compact viewers keep cards at a readable height and let a crowded row
     * scroll sideways instead of shrinking and overlapping its cards.
     */
    scroll: boolean;
    /** Landscape phones have room for one row a side, so creatures and the rest share it. */
    singleRow?: boolean;
}>();

type RowItem = { key: string; group: CardGroup; pile?: never } | { key: string; pile: LandPile; group?: never };

const front = computed<RowItem[]>(() =>
    frontRowGroups(props.battlefield.filter(isFrontRow), props.pairs, props.tucked).map((group) => ({ key: `${group.card.key}-${group.count}`, group })),
);

/** Back row: every non-creature permanent, copies of a name piled together. */
const back = computed<RowItem[]>(() => landPiles(props.battlefield.filter((card) => !isFrontRow(card))).map((pile) => ({ key: `pile-${pile.key}`, pile })));

/**
 * Creatures face the centre line; lands and other permanents sit behind them.
 * Every row is one card tall, empty or not, so cards keep one size on the
 * whole board and nothing moves as rows fill and empty.
 */
const rows = computed(() => {
    const creatures = { key: 'front', groups: front.value };
    const lands = { key: 'back', groups: back.value };

    if (props.singleRow) {
        return [{ key: 'all', groups: [...front.value, ...back.value] }];
    }

    return props.opponent ? [lands, creatures] : [creatures, lands];
});
</script>

<template>
    <!--
        Rows are one shared card height (useReplayCardHeight sizes it to fit),
        and what is left over gathers on the far side so the cards stay near
        the centre line.
    -->
    <div data-replay-field class="flex min-h-0 min-w-0 flex-1 basis-0 flex-col py-1" :class="opponent ? 'justify-end' : 'justify-start'">
        <div
            v-for="row in rows"
            :key="row.key"
            data-replay-row
            class="flex flex-none items-stretch gap-1.5"
            :class="
                scroll
                    ? [
                          'justify-center-safe overflow-x-auto overflow-y-hidden px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                          singleRow ? 'h-[calc(var(--replay-card-h)+1.25rem)] py-2.5' : 'h-[calc(var(--replay-card-h)+2rem)] py-4',
                      ]
                    : 'h-[calc(var(--replay-card-h)+0.875rem)] justify-center-safe px-2 py-1.75'
            "
        >
            <template v-for="(item, i) in row.groups" :key="item.key">
                <ReplayCardPile v-if="item.pile" :pile="item.pile" :opponent="opponent" :tucked="tucked" />
                <ReplayCardTile
                    v-else
                    :card="item.group.card"
                    :count="item.group.count"
                    :opponent="opponent"
                    :pair="pairs.get(item.group.card.key) ?? null"
                    :under="tucked.get(item.group.card.key)"
                    :last="scroll || i === row.groups.length - 1"
                />
            </template>
        </div>
    </div>
</template>
