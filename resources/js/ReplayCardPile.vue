<script setup lang="ts">
import ReplayCardTile from './ReplayCardTile.vue';
import type { LandPile } from './replayCards';

defineProps<{
    pile: LandPile;
    opponent: boolean;
}>();

/** How much of each card behind the front one shows, as a share of its width. */
const PEEK = 0.28;

/** A card's footprint in the pile: the front card whole, the rest a sliver. Tapped cards lie sideways, as wide as they are tall. */
function footprint(tapped: boolean, front: boolean): string {
    const width = tapped ? 88 : 63;

    return `${front ? width : width * PEEK} / 88`;
}
</script>

<template>
    <!-- Untapped copies, then tapped ones: two runs of offset cards, each ending on a whole card. -->
    <div class="flex h-full flex-none gap-1.5">
        <div v-for="part in pile.parts" :key="String(part.tapped)" class="flex h-full flex-none">
            <div
                v-for="(card, i) in part.cards"
                :key="card.Id"
                class="relative h-full flex-none"
                :style="{ aspectRatio: footprint(part.tapped, i === part.cards.length - 1) }"
            >
                <ReplayCardTile
                    class="absolute! top-0 left-0"
                    :card="card"
                    :count="i === part.cards.length - 1 && part.count > part.cards.length ? part.count : undefined"
                    :opponent="opponent"
                    :last="true"
                />
            </div>
        </div>
    </div>
</template>
