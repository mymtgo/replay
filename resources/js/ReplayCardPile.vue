<script setup lang="ts">
import ReplayCardTile from './ReplayCardTile.vue';
import type { LandPile } from './replayCards';
import { tuckExtraWidth } from './replayLinks';
import type { ReplayCardView } from './types';

const props = defineProps<{
    pile: LandPile;
    opponent: boolean;
    tucked: ReadonlyMap<string, ReplayCardView[]>;
}>();

/** Cards under a part's copies all show under its front card, the only whole one. */
function underPart(cards: ReplayCardView[]): ReplayCardView[] {
    return cards.flatMap((card) => props.tucked.get(card.key) ?? []);
}

/** How much of each card behind the front one shows, as a share of its width. */
const PEEK = 0.28;

/** A card's footprint in the pile: the front card whole, the rest a sliver. Tapped cards lie sideways, as wide as they are tall. */
function footprint(tapped: boolean, front: boolean, tuckedCount: number): string {
    const width = tapped ? 88 : 63;
    const base = `calc(var(--replay-card-h) * ${front ? width : width * PEEK} / 88)`;

    return tuckedCount ? `calc(${base} + ${tuckExtraWidth(tuckedCount)})` : base;
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
                :style="{ width: footprint(part.tapped, i === part.cards.length - 1, i === part.cards.length - 1 ? underPart(part.cards).length : 0) }"
            >
                <ReplayCardTile
                    class="absolute! top-0 left-0"
                    :card="card"
                    :count="i === part.cards.length - 1 && part.count > part.cards.length ? part.count : undefined"
                    :opponent="opponent"
                    :under="i === part.cards.length - 1 ? underPart(part.cards) : undefined"
                    :last="true"
                />
            </div>
        </div>
    </div>
</template>
