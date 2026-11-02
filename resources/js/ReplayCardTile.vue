<script setup lang="ts">
import { Shield, Swords } from 'lucide-vue-next';
import { computed } from 'vue';
import ReplayCardImage from './ReplayCardImage.vue';
import ReplayDie from './ReplayDie.vue';
import { TUCK_LAYERS, TUCK_PEEK, tuckExtraWidth } from './replayLinks';
import { counterDice, isCreature, ptCounterLabel } from './replayCards';
import { useReplayContext } from './replayContext';
import type { ReplayCardView } from './types';

const props = defineProps<{
    card: ReplayCardView;
    /** How many identical cards this tile stands for; shows a ×N badge above 1. */
    count?: number;
    /** Opponent cards lift down toward the centre line when attacking, yours lift up. */
    opponent: boolean;
    /** Shared number linking a blocker to the attacker it blocks. */
    pair?: number | null;
    /** Cards tucked under this one: what it exiled and what is attached to it. They peek out to its right. */
    under?: ReplayCardView[];
    /** The last card in a row never shrinks, so crowded rows overlap instead of wrapping. */
    last: boolean;
}>();

const { showPreview, hidePreview, pinPreview } = useReplayContext();

const tapped = computed(() => props.card.tapped);
const attacking = computed(() => props.card.attacking !== null);
const blocking = computed(() => props.card.blocking !== null);
const ptCounters = computed(() => ptCounterLabel(props.card));
const dice = computed(() => counterDice(props.card));
const showPt = computed(() => isCreature(props.card));

const hostWidth = computed(() => (tapped.value ? 'var(--replay-card-h)' : 'calc(var(--replay-card-h) * 63 / 88)'));
const tuckedShown = computed(() => (props.under ?? []).slice(0, TUCK_LAYERS));

const lift = computed(() => (attacking.value ? (props.opponent ? 14 : -14) : 0));

const ring = computed(() => (attacking.value ? '#e5484d' : blocking.value ? '#f5a524' : 'transparent'));
</script>

<template>
    <!--
        Sized from the shared card height rather than aspect-ratio, which Safari
        gets wrong in a flex row. Tapped cards lie sideways, as wide as they are tall.
    -->
    <div
        class="relative h-(--replay-card-h) min-w-[18px] hover:z-20!"
        :style="{
            width: under?.length ? `calc(${hostWidth} + ${tuckExtraWidth(under.length)})` : hostWidth,
            flex: `0 ${last ? 0 : 1} auto`,
            zIndex: attacking ? 3 : 1,
        }"
    >
        <div
            v-for="(tuckedCard, i) in tuckedShown"
            :key="tuckedCard.key"
            data-replay-tucked
            class="absolute top-0 h-(--replay-card-h) w-[calc(var(--replay-card-h)*63/88)] rounded-[5px] bg-muted shadow-[0_2px_6px_rgba(0,0,0,.35)]"
            :style="{ left: `calc(${hostWidth} - var(--replay-card-h) * 63 / 88 * ${1 - TUCK_PEEK * (tuckedShown.length - i)})`, zIndex: 0 }"
            @mouseenter="showPreview($event, tuckedCard)"
            @mouseleave="hidePreview"
            @click="pinPreview($event, tuckedCard)"
        >
            <ReplayCardImage :name="tuckedCard.name" :image="tuckedCard.image" />
        </div>

        <div
            class="absolute top-0 left-0 h-(--replay-card-h) w-[calc(var(--replay-card-h)*63/88)] rounded-[5px] bg-muted transition-[transform,box-shadow] duration-200 ease-out"
            :style="{
                boxShadow: `0 0 0 2px ${ring}, 0 2px 6px rgba(0,0,0,.35)`,
                transform: `translate(${tapped ? 19.8 : 0}%, ${lift}px) rotate(${tapped ? 90 : 0}deg)`,
            }"
            @mouseenter="showPreview($event, card)"
            @mouseleave="hidePreview"
            @click="pinPreview($event, card)"
        >
            <ReplayCardImage :name="card.name" :image="card.image" />

            <div
                v-if="(count ?? 1) > 1"
                class="absolute bottom-[7%] left-1/2 -translate-x-1/2 rounded-full bg-[rgba(12,12,12,.88)] px-1.75 py-px text-[11px] font-bold text-white"
            >
                ×{{ count }}
            </div>

            <div v-if="ptCounters || dice.length" class="absolute top-[16%] right-0.75 left-0.75 flex flex-col items-start gap-0.5">
                <span
                    v-if="ptCounters"
                    class="rounded bg-[#f3eedf] px-1.25 py-px font-mono text-[10px] font-bold whitespace-nowrap text-[#1a1a1a] shadow-[0_1px_2px_rgba(0,0,0,.4)]"
                >
                    {{ ptCounters }}
                </span>
                <span v-for="counter in dice" :key="counter.kind" :title="counter.label" class="flex w-full flex-wrap gap-[3%]">
                    <!-- A d6 is about a quarter of a card's width on a real table. -->
                    <span v-for="(face, i) in counter.faces" :key="i" class="w-[26%]">
                        <ReplayDie :face="face" />
                    </span>
                </span>
            </div>

            <div
                v-if="attacking"
                title="Attacking"
                class="absolute top-0.75 right-0.75 flex h-4.5 items-center gap-0.5 rounded-full bg-[#e5484d] px-1.25 text-[10px] font-bold text-white"
            >
                <Swords :size="11" :stroke-width="2.5" />
                <span v-if="pair">{{ pair }}</span>
            </div>
            <div
                v-else-if="blocking"
                title="Blocking"
                class="absolute top-0.75 right-0.75 flex h-4.5 items-center gap-0.5 rounded-full bg-[#f5a524] px-1.25 text-[10px] font-bold text-[#1a1a1a]"
            >
                <Shield :size="11" :stroke-width="2.5" />
                <span v-if="pair">{{ pair }}</span>
            </div>

            <div
                v-if="card.damage > 0"
                class="absolute bottom-0.75 left-0.75 rounded bg-[#e5484d] px-1.25 py-px text-[10px] font-bold text-white"
            >
                {{ card.damage }} dmg
            </div>

            <div
                v-if="showPt"
                class="absolute right-0.75 bottom-0.75 rounded bg-[rgba(12,12,12,.88)] px-1.25 py-px font-mono text-[11px] font-bold text-white"
            >
                {{ card.power }}/{{ card.toughness }}
            </div>
        </div>
    </div>
</template>
