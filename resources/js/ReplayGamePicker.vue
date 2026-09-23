<script setup lang="ts">
import { useReplayContext } from './replayContext';
import type { ReplayMatchGame } from './types';

/** Jumps between the games of the match. Results stay hidden so no game is spoiled. */
defineProps<{
    games: ReplayMatchGame[];
    gameId: number;
}>();

const { gameHref, linkComponent, selectGame } = useReplayContext();

const itemClass = 'grid h-6.5 min-w-9 cursor-pointer place-items-center rounded-md px-1.5 text-xs font-semibold tabular-nums';
</script>

<template>
    <nav aria-label="Games in this match" class="flex flex-none items-center gap-0.5 rounded-lg bg-background p-0.5">
        <template v-for="game in games" :key="game.id">
            <component
                :is="linkComponent"
                v-if="gameHref"
                :href="gameHref(game.id)"
                :title="`Game ${game.number}`"
                :aria-current="game.id === gameId ? 'page' : undefined"
                :class="[itemClass, game.id === gameId ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground']"
            >
                G{{ game.number }}
            </component>
            <button
                v-else
                type="button"
                :title="`Game ${game.number}`"
                :aria-current="game.id === gameId ? 'page' : undefined"
                :class="[itemClass, game.id === gameId ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground']"
                @click="selectGame?.(game.id)"
            >
                G{{ game.number }}
            </button>
        </template>
    </nav>
</template>
