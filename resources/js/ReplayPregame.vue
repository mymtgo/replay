<script setup lang="ts">
import ReplayCardImage from './ReplayCardImage.vue';
import ReplayDie from './ReplayDie.vue';
import { useReplayContext } from './replayContext';
import { pregameBadges, type PregameView } from './replayPregame';

defineProps<{
    view: PregameView;
    localId: string | null;
}>();

const { images } = useReplayContext();

const TONES = { win: 'bg-primary/20 text-foreground', warn: 'bg-warning/20 text-warning', plain: 'bg-white/8 text-muted-foreground' } as const;
</script>

<template>
    <div class="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-center px-2 @7xl:justify-end @7xl:pr-10">
        <div class="replay-texture-bg flex w-max max-w-full flex-col items-center gap-2.5 rounded-lg border border-white/10 px-5 py-3 shadow-[0_6px_24px_rgba(0,0,0,.55)]" data-replay-pregame>
            <div class="flex items-start gap-8">
                <div v-for="player in view.players" :key="player.name" class="flex min-w-24 flex-col items-center gap-1.5">
                    <span class="text-xs font-semibold" :class="player.name === localId ? 'text-foreground' : 'text-muted-foreground'">{{ player.name }}</span>
                    <div v-if="player.roll" class="w-11 rounded-md" :class="view.round?.winner === player.name ? 'ring-2 ring-primary' : 'opacity-70'">
                        <ReplayDie v-if="player.roll.face" :face="player.roll.face" />
                        <span v-else class="grid aspect-square place-items-center rounded-md bg-white text-base font-bold text-black">{{ player.roll.result }}</span>
                    </div>
                    <div class="flex flex-col items-center gap-1">
                        <span v-for="badge in pregameBadges(view, player.name)" :key="badge.text" class="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" :class="TONES[badge.tone]">
                            {{ badge.text }}
                        </span>
                    </div>
                    <div v-if="player.bottomed.length" class="flex flex-col items-center gap-1">
                        <span class="text-[10.5px] text-muted-foreground">
                            {{ player.name === localId ? 'To the bottom' : `${player.bottomed.length} ${player.bottomed.length === 1 ? 'card' : 'cards'} to the bottom` }}
                        </span>
                        <div class="flex gap-1">
                            <div v-for="(name, i) in player.bottomed" :key="i" class="relative aspect-63/88 w-11 rounded shadow-[0_1px_4px_rgba(0,0,0,.5)]" :title="name ?? undefined">
                                <ReplayCardImage :name="name" :image="name ? images(name) : null" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <span v-if="view.action" class="max-w-80 text-center text-xs text-muted-foreground">{{ view.action }}</span>
        </div>
    </div>
</template>
