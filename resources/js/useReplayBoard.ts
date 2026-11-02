import type { Game, GameState, Player } from '@mtgreplay/mtgr';
import { computed, type Ref } from 'vue';
import type { ReplayGameInfo, ReplayTimeline } from './replayGame';
import { cardViews, effectViews, liveObjects, objectZone, playerView, stackItems, WINDOW_ZONES } from './replayState';
import { tuckedKeys, tuckedUnder } from './replayLinks';
import { turnAt } from './replayTimeline';
import type { CardImageResolver, ReplayCardView, ReplayDerived, ReplayPlayerView, ReplayZone } from './types';

export type ReplaySideView = {
    player: ReplayPlayerView;
    opponent: boolean;
    active: boolean;
    priority: boolean;
    battlefield: ReplayCardView[];
    /** Cards under a permanent on either side, by the host's key. */
    tucked: ReadonlyMap<string, ReplayCardView[]>;
    /** Visible cards per zone; an opponent's hand counts the cards whose faces are known. */
    zoneCounts: Record<ReplayZone, number>;
    /** Whether the HUD offers a sideboard: when the game lists the player's deck with one. */
    sideboard: boolean;
};

const EMPTY_DERIVED: ReplayDerived = { step: null, priority: null, active: null, attacking: new Map(), blocking: new Map(), damage: new Map(), clocks: {} };

/** Everything the board shows for the moment under the cursor. */
export function useReplayBoard(
    game: Readonly<Ref<Game>>,
    info: Readonly<Ref<ReplayGameInfo>>,
    timeline: Readonly<Ref<ReplayTimeline>>,
    current: Readonly<Ref<number>>,
    images: Readonly<Ref<CardImageResolver>>,
    /** Cards in each player's sideboard as the deck block lists it; absent when the game lists no deck for them. */
    sideboardSizes: Readonly<Ref<Record<Player, number>>>,
) {
    const moment = computed(() => timeline.value.moments[current.value] ?? null);
    const state = computed<GameState | null>(() => (moment.value ? (timeline.value.steps[moment.value.index]?.state ?? null) : null));
    const derived = computed<ReplayDerived>(() => (moment.value ? (timeline.value.derived[moment.value.index] ?? EMPTY_DERIVED) : EMPTY_DERIVED));

    const players = computed<ReplayPlayerView[]>(() =>
        state.value ? info.value.players.map((name) => playerView(name, state.value!, derived.value, info.value)) : [],
    );
    const local = computed(() => players.value.find((player) => player.local) ?? players.value[0] ?? null);
    const opponent = computed(() => players.value.find((player) => player.id !== local.value?.id) ?? null);

    const cardsByKey = computed(() => (state.value ? cardViews(state.value, derived.value, images.value) : new Map<string, ReplayCardView>()));
    const cards = computed(() => [...cardsByKey.value.values()]);
    /** Each live object's zone by key, as the windows name zones. */
    const zones = computed(() => new Map(state.value ? liveObjects(state.value).map((object) => [`#${object.id.n}`, objectZone(object)]) : []));

    const turn = computed(() => turnAt(timeline.value.turns, current.value));
    const activeId = computed(() => state.value?.activePlayer ?? null);
    const step = computed(() => derived.value.step);
    const incomplete = computed(() => state.value?.incomplete ?? false);

    function playerName(id: Player | undefined | null): string {
        return id ?? '';
    }

    function inZone(zone: ReplayZone, owner: Player): ReplayCardView[] {
        return cards.value.filter((card) => zones.value.get(card.key) === WINDOW_ZONES[zone] && card.owner === owner);
    }

    /** Blockers and the attackers they block share a number. */
    const pairs = computed(() => {
        const map = new Map<string, number>();
        let next = 0;

        cards.value.forEach((card) => {
            if (card.blocking === null) {
                return;
            }

            const number = map.get(card.blocking) ?? ++next;
            map.set(card.blocking, number);
            map.set(card.key, number);
        });

        return map;
    });

    /** Exiled-with and attached cards, drawn under their host instead of in a row or only in the exile window. */
    const tucked = computed(() => tuckedUnder(cards.value, zones.value));
    const hiddenInRows = computed(() => tuckedKeys(tucked.value));

    const stack = computed(() => (state.value ? stackItems(state.value, cardsByKey.value) : []));
    const effects = computed(() => (state.value ? effectViews(state.value) : []));

    const hand = computed(() => (local.value ? inZone('Hand', local.value.id) : []));
    /** Their hand cards whose faces are known: identified or revealed while there. */
    const opponentHand = computed(() => (opponent.value ? inZone('Hand', opponent.value.id).filter((card) => card.name !== null) : []));

    const sides = computed<ReplaySideView[]>(() =>
        [opponent.value, local.value]
            .filter((player): player is ReplayPlayerView => player !== null)
            .map((player) => ({
                player,
                opponent: player.id !== local.value?.id,
                active: activeId.value === player.id,
                priority: derived.value.priority === player.id,
                battlefield: cards.value.filter((card) => zones.value.get(card.key) === 'battlefield' && card.controller === player.id && !hiddenInRows.value.has(card.key)),
                tucked: tucked.value,
                zoneCounts: {
                    Hand: player.id === local.value?.id ? hand.value.length : opponentHand.value.length,
                    Graveyard: inZone('Graveyard', player.id).length,
                    Exile: inZone('Exile', player.id).length,
                    Sideboard: sideboardSizes.value[player.id] ?? 0,
                },
                sideboard: (sideboardSizes.value[player.id] ?? 0) > 0,
            })),
    );

    return { moment, state, derived, players, local, opponent, cards, cardsByKey, zones, turn, activeId, step, incomplete, pairs, stack, effects, hand, opponentHand, sides, playerName, inZone };
}
