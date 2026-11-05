<script setup lang="ts">
import { parse, validate, tagValue, type Game, type Problem } from '@mtgreplay/mtgr';
import { computed, shallowRef } from 'vue';
import ReplayViewer from '@replay/ReplayViewer.vue';
import SnapshotReplayViewer from '@replay/snapshot/ReplayViewer.vue';
import type { ReplayFrame, ReplayLogEntry } from '@replay/snapshot/types';
import snapshotSample from './snapshot-sample.json';

/** A stored snapshot-v2 match, the JSON MyMTGO shared before `.mtgr`. */
type Snapshot = { games: Array<{ game_number: number; won: boolean | null; frames: ReplayFrame[]; log: ReplayLogEntry[] }> };
const SNAPSHOT_SAMPLE = 'snapshot-sample.json';

const EXAMPLES = ['mycospawn-turn-5.mtgr', 'match.mtgr', 'targeting.mtgr', 'lasting-effects.mtgr', 'opening-hand.mtgr', 'snapshot-sample.json'];

const fileName = shallowRef<string | null>(null);
const games = shallowRef<Game[]>([]);
const problems = shallowRef<Problem[]>([]);
const gameIndex = shallowRef(0);
const dragging = shallowRef(false);
const snapshot = shallowRef<Snapshot | null>(null);

const snapshotGame = computed(() => snapshot.value?.games[gameIndex.value] ?? null);
const snapshotGames = computed(() => snapshot.value?.games.map((item, index) => ({ id: index, number: item.game_number, won: item.won })) ?? []);

const game = computed(() => games.value[gameIndex.value] ?? null);

function load(name: string, text: string) {
    fileName.value = name;
    gameIndex.value = 0;

    if (name.endsWith('.json')) {
        snapshot.value = JSON.parse(text) as Snapshot;
        problems.value = [];
        games.value = [];

        return;
    }

    snapshot.value = null;
    problems.value = validate(text);
    games.value = parse(text).file.games;
}

async function loadExample(name: string) {
    if (name === SNAPSHOT_SAMPLE) {
        return load(name, JSON.stringify(snapshotSample));
    }

    load(name, await fetch(`/${name}`).then((response) => response.text()));
}

async function loadFile(file: File | undefined) {
    if (file) {
        load(file.name, await file.text());
    }
}

function onDrop(event: DragEvent) {
    dragging.value = false;
    loadFile(event.dataTransfer?.files[0]);
}

function onPick(event: Event) {
    loadFile((event.target as HTMLInputElement).files?.[0]);
}

/**
 * A card's image: by its MTGO or Arena id through mymtgo.com when the file gives
 * one, so the printing played shows, else Scryfall's by name; a back face by its
 * own name, which Scryfall finds on the double-faced card. A card named `?`
 * (null) has only its ids.
 */
function cardImage(name: string | null, face?: string, sources?: readonly string[]): string | null {
    const id = sources?.find((source) => /^(mtgo|arena):\d+$/.test(source));

    if (id) {
        return `https://mymtgo.com/api/card-images/${id.replace(':', '/')}`;
    }

    if (name === null) {
        return null;
    }

    const query = face && face !== name ? `exact=${encodeURIComponent(face)}&face=back` : `exact=${encodeURIComponent(name)}`;

    return `https://api.scryfall.com/cards/named?${query}&format=image&version=normal`;
}

function gameLabel(item: Game, index: number): string {
    return `Game ${tagValue(item, 'Game') ?? index + 1}`;
}
</script>

<template>
    <div class="flex h-screen flex-col bg-background text-foreground" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
        <header class="flex flex-none flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-sm">
            <span class="font-semibold">.mtgr viewer</span>
            <label class="cursor-pointer rounded-md border border-border px-2 py-1 hover:bg-accent">
                Open file
                <input type="file" accept=".mtgr,.json,text/plain" class="hidden" @change="onPick" />
            </label>
            <span class="text-muted-foreground">or drop one here, or try</span>
            <button
                v-for="name in EXAMPLES"
                :key="name"
                type="button"
                class="rounded-md px-2 py-1 hover:bg-accent"
                :class="name === fileName ? 'bg-accent' : 'text-muted-foreground'"
                @click="loadExample(name)"
            >
                {{ name }}
            </button>
            <div class="flex-1" />
            <nav v-if="games.length > 1" class="flex items-center gap-0.5 rounded-lg bg-card p-0.5">
                <button
                    v-for="(item, index) in games"
                    :key="index"
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-semibold"
                    :class="index === gameIndex ? 'bg-accent' : 'text-muted-foreground hover:text-foreground'"
                    @click="gameIndex = index"
                >
                    {{ gameLabel(item, index) }}
                </button>
            </nav>
        </header>

        <div v-if="problems.length" class="flex-none border-b border-warning/40 bg-warning/10 px-3 py-1.5 text-xs">
            <details>
                <summary class="cursor-pointer font-semibold text-warning">{{ problems.length }} validation {{ problems.length === 1 ? 'problem' : 'problems' }} in {{ fileName }}</summary>
                <ul class="mt-1 max-h-40 overflow-y-auto font-mono">
                    <li v-for="(problem, i) in problems" :key="i">line {{ problem.line }}, check {{ problem.check }}: {{ problem.message }}</li>
                </ul>
            </details>
        </div>

        <main class="relative min-h-0 flex-1">
            <div v-if="dragging" class="pointer-events-none absolute inset-0 z-100 grid place-items-center bg-primary/20 text-lg font-semibold">Drop the .mtgr or snapshot file</div>
            <SnapshotReplayViewer
                v-if="snapshotGame"
                :key="`${fileName}:${gameIndex}`"
                :frames="snapshotGame.frames"
                :log="snapshotGame.log"
                :won="snapshotGame.won"
                :game-id="gameIndex"
                :match-games="snapshotGames"
                @select-game="gameIndex = $event"
            />
            <ReplayViewer v-else-if="game" :key="`${fileName}:${gameIndex}`" :games="games" :game-index="gameIndex" :card-image="cardImage" @select-game="gameIndex = $event" />
            <div v-else class="grid size-full place-items-center text-muted-foreground">Load a .mtgr file to start.</div>
        </main>
    </div>
</template>
