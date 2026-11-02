<script setup lang="ts">
import ReplayCardTile from './ReplayCardTile.vue';
import type { LandPile } from './replayCards';
import { PILE_PEEK } from './replayRows';
import type { ReplayCardView } from './types';

const props = defineProps<{
    pile: LandPile;
    opponent: boolean;
    tucked: ReadonlyMap<string, ReplayCardView[]>;
}>();

/** Cards tucked under a part's copies show above its front card, the only whole one. A card with tucked cards is never piled, so this is the front card's own. */
function underPart(cards: ReplayCardView[]): ReplayCardView[] {
    return cards.flatMap((card) => props.tucked.get(card.key) ?? []);
}

/** A card's footprint in the pile: the front card whole, the rest a sliver. Tapped cards lie sideways, as wide as they are tall. */
function footprint(tapped: boolean, front: boolean): string {
    const width = tapped ? 88 : 63;
    return `calc(var(--replay-card-h) * ${front ? width : width * PILE_PEEK} / 88)`;
}
</script>

<template>
    <!-- Untapped copies, then tapped ones: two runs of offset cards, each ending on a whole card. -->
    <div class="flex h-(--replay-card-h) flex-none gap-1.5">
        <div v-for="part in pile.parts" :key="String(part.tapped)" class="flex h-(--replay-card-h) flex-none">
            <div
                v-for="(card, i) in part.cards"
                :key="card.key"
                class="relative h-(--replay-card-h) flex-none"
                :style="{ width: footprint(part.tapped, i === part.cards.length - 1) }"
            >
                <ReplayCardTile
                    class="absolute! top-0 left-0"
                    :card="card"
                    :count="i === part.cards.length - 1 && part.count > part.cards.length ? part.count : undefined"
                    :opponent="opponent"
                    :represents="i === part.cards.length - 1 ? part.hidden : undefined"
                    :under="i === part.cards.length - 1 ? underPart(part.cards) : undefined"
                    :last="true"
                />
            </div>
        </div>
    </div>
</template>
