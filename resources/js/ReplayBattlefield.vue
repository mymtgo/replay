<script setup lang="ts">
import { computed } from 'vue';
import ReplayCardPile from './ReplayCardPile.vue';
import ReplayCardTile from './ReplayCardTile.vue';
import { frontRowGroups, isFrontRow, isLand, landPiles, type CardGroup, type LandPile } from './replayCards';
import type { ReplayCard } from './types';

const props = defineProps<{
    battlefield: ReplayCard[];
    opponent: boolean;
    pairs: Map<number, number>;
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
    frontRowGroups(props.battlefield.filter(isFrontRow), props.pairs).map((group) => ({ key: `${group.card.Id}-${group.count}`, group })),
);

/** Back row: land piles first, then other non-creature permanents one to a tile. */
const back = computed<RowItem[]>(() => {
    const cards = props.battlefield.filter((card) => !isFrontRow(card));

    return [
        ...landPiles(cards.filter(isLand)).map((pile) => ({ key: `pile-${pile.key}`, pile })),
        ...cards.filter((card) => !isLand(card)).map((card) => ({ key: String(card.Id), group: { card, count: 1 } })),
    ];
});

/**
 * Creatures face the centre line; lands and other permanents sit behind them.
 * Creatures take the larger share: lands pile up, while creatures only
 * collapse as a swarm of identical copies.
 */
const rows = computed(() => {
    const creatures = { key: 'front', groups: front.value, grow: 1.5 };
    const lands = { key: 'back', groups: back.value, grow: 1 };

    if (props.singleRow) {
        return [{ key: 'all', groups: [...front.value, ...back.value], grow: 1 }];
    }

    return props.opponent ? [lands, creatures] : [creatures, lands];
});
</script>

<template>
    <!--
        An empty row shrinks to its padding and hands its height to the other.
        Rows stop growing at a comfortable card size, and what is left over
        gathers on the far side so the cards stay near the centre line.
    -->
    <div class="flex min-h-0 min-w-0 flex-1 basis-0 flex-col py-1" :class="opponent ? 'justify-end' : 'justify-start'">
        <div
            v-for="row in rows"
            :key="row.key"
            class="flex min-h-0 basis-0 items-stretch gap-1.5"
            :class="
                scroll
                    ? [
                          'max-h-38 justify-center-safe overflow-x-auto overflow-y-hidden px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                          singleRow ? 'py-2.5' : 'py-4',
                      ]
                    : 'max-h-56 justify-center-safe px-2 py-1.75'
            "
            :style="{ flexGrow: row.groups.length ? row.grow : 0, flexShrink: 1 }"
        >
            <template v-for="(item, i) in row.groups" :key="item.key">
                <ReplayCardPile v-if="item.pile" :pile="item.pile" :opponent="opponent" />
                <ReplayCardTile
                    v-else
                    :card="item.group.card"
                    :count="item.group.count"
                    :opponent="opponent"
                    :pair="pairs.get(item.group.card.Id) ?? null"
                    :last="scroll || i === row.groups.length - 1"
                />
            </template>
        </div>
    </div>
</template>
