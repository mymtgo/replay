<script setup lang="ts">
import { ChevronRight, Crosshair, Shield, Swords, User } from 'lucide-vue-next';
import { computed } from 'vue';
import ReplayCardImage from './ReplayCardImage.vue';
import ReplayDie from './ReplayDie.vue';
import ReplayTargetMark from './ReplayTargetMark.vue';
import { TAPPED_TOP, TUCK_LAYERS, tuckLift } from './replayLinks';
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
    /** Keys of the other cards this tile stands for: the rest of a counted swarm, the copies a pile does not draw. */
    represents?: string[];
    /** Cards tucked under this one: what it exiled and what is attached to it. They peek out to its right. */
    under?: ReplayCardView[];
    /** The last card in a row never shrinks, so crowded rows overlap instead of wrapping. */
    last: boolean;
}>();

/** White ring, red ring and glow: reads against every card art and apart from the attack and block rings. */
const TARGET_SHADOW = '0 0 0 2px #e5484d, 0 2px 6px rgba(0,0,0,.35)';

const { showPreview, hidePreview, pinPreview, highlightedTargets } = useReplayContext();

const tapped = computed(() => props.card.tapped);
const attacking = computed(() => props.card.attacking !== null);
/** A planeswalker or battle being attacked. */
const attacked = computed(() => props.card.attackers > 0);
const blocking = computed(() => props.card.blocking !== null);
const ptCounters = computed(() => ptCounterLabel(props.card));
const dice = computed(() => counterDice(props.card));
const showPt = computed(() => isCreature(props.card));

const hostWidth = computed(() => (tapped.value ? 'var(--replay-card-h)' : 'calc(var(--replay-card-h) * 63 / 88)'));
const tuckedShown = computed(() => (props.under ?? []).slice(0, TUCK_LAYERS));

/** Where a tucked card's top edge sits, in card heights from the tile's top: above the host's own top, each further card a smaller step higher. */
const tuckTop = (i: number): number => (tapped.value ? TAPPED_TOP : 0) - tuckLift(i + 1);

const marked = (key: string) => highlightedTargets.value.has(key);

/** A stack entry targets this card, a card it stands for, or one tucked under it that is not drawn. */
const targeted = computed(() => marked(props.card.key) || (props.represents ?? []).some(marked) || (props.under ?? []).slice(TUCK_LAYERS).some((card) => marked(card.key)));

const lift = computed(() => (attacking.value ? (props.opponent ? 14 : -14) : 0));

const ring = computed(() => (attacking.value || attacked.value ? '#e5484d' : blocking.value ? '#f5a524' : 'transparent'));
</script>

<template>
    <!--
        Sized from the shared card height rather than aspect-ratio, which Safari
        gets wrong in a flex row. Tapped cards lie sideways, as wide as they are tall.
    -->
    <div
        class="relative h-(--replay-card-h) min-w-[18px] hover:z-20!"
        :style="{
            width: hostWidth,
            flex: `0 ${last ? 0 : 1} auto`,
            zIndex: targeted ? 8 : attacking ? 3 : 1,
        }"
    >
        <div
            v-for="(tuckedCard, i) in tuckedShown"
            :key="tuckedCard.key"
            data-replay-tucked
            class="absolute h-(--replay-card-h) w-[calc(var(--replay-card-h)*63/88)] rounded-[5px] bg-muted"
            :style="{ boxShadow: marked(tuckedCard.key) ? TARGET_SHADOW : '0 2px 6px rgba(0,0,0,.35)', top: `calc(var(--replay-card-h) * ${tuckTop(i)})`, left: `calc((${hostWidth} - var(--replay-card-h) * 63 / 88) / 2)`, zIndex: -i }"
            @mouseenter="showPreview($event, tuckedCard)"
            @mouseleave="hidePreview"
            @click="pinPreview($event, tuckedCard)"
        >
            <ReplayCardImage :name="tuckedCard.name" :unknown="tuckedCard.nameUnknown" :image="tuckedCard.image" />
            <ReplayTargetMark v-if="marked(tuckedCard.key)" variant="corner" />
        </div>

        <div
            class="absolute top-0 left-0 h-(--replay-card-h) w-[calc(var(--replay-card-h)*63/88)] rounded-[5px] bg-muted transition-[transform,box-shadow] duration-200 ease-out"
            :style="{
                boxShadow: targeted ? TARGET_SHADOW : `0 0 0 2px ${ring}, 0 2px 6px rgba(0,0,0,.35)`,
                transform: `translate(${tapped ? 19.8 : 0}%, ${lift}px) rotate(${tapped ? 90 : 0}deg)`,
            }"
            @mouseenter="showPreview($event, card)"
            @mouseleave="hidePreview"
            @click="pinPreview($event, card)"
        >
            <ReplayCardImage :name="card.name" :unknown="card.nameUnknown" :image="card.image" />

            <ReplayTargetMark v-if="targeted" variant="card" />

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
                v-if="card.attacking"
                :title="`Attacking ${card.attacking.label}`"
                class="absolute top-0.75 right-0.75 flex h-4.5 items-center gap-0.5 rounded-full bg-[#e5484d] px-1.25 text-[10px] font-bold text-white"
            >
                <Swords :size="11" :stroke-width="2.5" />
                <span v-if="pair">{{ pair }}</span>
                <ChevronRight :size="9" :stroke-width="3" class="-mx-0.5 opacity-80" />
                <User v-if="card.attacking.kind === 'player'" :size="11" :stroke-width="2.5" />
                <Crosshair v-else :size="11" :stroke-width="2.5" />
            </div>
            <div
                v-else-if="attacked"
                :title="`Attacked by ${card.attackers} ${card.attackers === 1 ? 'creature' : 'creatures'}`"
                class="absolute top-0.75 right-0.75 flex h-4.5 items-center gap-0.5 rounded-full bg-[#e5484d] px-1.25 text-[10px] font-bold text-white"
            >
                <Crosshair :size="11" :stroke-width="2.5" />
                <span>{{ card.attackers }}</span>
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
