import { computed, type Ref } from 'vue';
import { discardLinks } from './replayDiscards';
import { knownOpponentHands } from './replayKnownHand';
import { normaliseStep } from './replayPhases';
import { collectReveals } from './replayReveals';
import { gameSideboard, sideboardAtStart } from './replaySideboard';
import { turnAt } from './replayTimeline';
import type { ReplayCard, ReplayFrame, ReplayPlayer, ReplaySideboardEntry, ReplayTurn, ReplayZone } from './types';

export type ReplaySideView = {
    player: ReplayPlayer;
    opponent: boolean;
    active: boolean;
    priority: boolean;
    battlefield: ReplayCard[];
    /** Visible cards per zone; an opponent's hand counts every card revealed so far. */
    zoneCounts: Record<ReplayZone, number>;
    /** Whether the HUD offers a sideboard: yours, when the game recorded one. */
    sideboard: boolean;
};

/**
 * A modal double-faced card played as its land face arrives under the face's
 * own CatalogID, which the catalog maps to the creature-face printing. When a
 * frame carries power/toughness (sidecar frames do), a multi-face creature on
 * the battlefield without any is showing its land face, so it is typed as one.
 */
function resolvePlayedFaces(cards: ReplayCard[]): ReplayCard[] {
    if (!cards.some((card) => card.Power != null)) {
        return cards;
    }

    return cards.map((card) =>
        card.Zone === 'Battlefield' && card.Power == null && card.name?.includes(' // ') && card.type?.includes('Creature')
            ? { ...card, type: 'Land' }
            : card,
    );
}

/** Everything the board shows for the frame under the cursor. */
export function useReplayBoard(
    frames: Ref<ReplayFrame[]>,
    current: Readonly<Ref<number>>,
    turns: Ref<ReplayTurn[]>,
    sideboardEntries: Readonly<Ref<ReplaySideboardEntry[] | null>>,
) {
    const frame = computed(() => frames.value[current.value] ?? null);
    const content = computed(() => frame.value?.content ?? null);
    const players = computed(() => content.value?.Players ?? []);
    const local = computed(() => players.value.find((player) => player.IsLocal) ?? players.value[0] ?? null);
    const opponent = computed(() => players.value.find((player) => player.Id !== local.value?.Id) ?? null);
    const cards = computed(() => resolvePlayedFaces(content.value?.Cards ?? []));
    const cardsById = computed(() => new Map(cards.value.map((card) => [card.Id, card])));

    const turn = computed(() => turnAt(turns.value, current.value));
    const activeId = computed(() => turn.value?.player ?? null);
    const step = computed(() => normaliseStep(content.value?.Step, content.value?.Phase));

    function playerName(id: number | undefined): string {
        return players.value.find((player) => player.Id === id)?.Name ?? '';
    }

    function zoneCount(id: number, zone: ReplayZone): number {
        return cards.value.filter((card) => card.Zone === zone && card.Owner === id).length;
    }

    /** Your sideboard as the game began, recorded entries first; computed once per game. */
    const startingSideboard = computed(() => gameSideboard(frames.value, sideboardEntries.value));
    /** Whether the frames themselves hold your sideboard; the sidecar's never do. */
    const framesHoldSideboard = computed(() => sideboardAtStart(frames.value) !== null);

    /**
     * Your sideboard for the window: live from the frame when the frames hold
     * it, so a card fetched mid-game leaves, otherwise as the game began.
     */
    const sideboard = computed(() => {
        if (framesHoldSideboard.value) {
            return cards.value.filter((card) => card.Zone === 'Sideboard' && card.Owner === local.value?.Id);
        }

        return startingSideboard.value ?? [];
    });

    /** Blockers and the attackers they block share a number. */
    const pairs = computed(() => {
        const map = new Map<number, number>();
        let next = 0;

        cards.value.forEach((card) => {
            if (card.Zone !== 'Battlefield' || card.Blocking == null) {
                return;
            }

            const number = map.get(card.Blocking) ?? ++next;
            map.set(card.Blocking, number);
            map.set(card.Id, number);
        });

        return map;
    });

    /** Newest object on top: MTGO hands out rising ids as objects move zones. */
    const stack = computed(() => cards.value.filter((card) => card.Zone === 'Stack').sort((a, b) => b.Id - a.Id));

    const hand = computed(() => cards.value.filter((card) => card.Zone === 'Hand' && card.Owner === local.value?.Id));

    /** Everything the opponent has shown from hand up to this frame, newest first. */
    const reveals = computed(() => collectReveals(frames.value, turns.value));
    const revealedSoFar = computed(() => reveals.value.filter((reveal) => reveal.frame <= current.value).toReversed());

    /** Computed once per game; playback only indexes into it. */
    const knownHands = computed(() => knownOpponentHands(frames.value));

    /** Which spell took which cards; computed once per game like the known hands. */
    const discards = computed(() => discardLinks(frames.value));

    /** Cards of theirs we know are in hand: a reveal stays face up until the card is seen leaving. */
    const opponentHand = computed(() => knownHands.value[current.value] ?? []);

    const sides = computed<ReplaySideView[]>(() =>
        [opponent.value, local.value]
            .filter((player): player is ReplayPlayer => player !== null)
            .map((player) => ({
                player,
                opponent: player.Id !== local.value?.Id,
                active: activeId.value === player.Id,
                priority: content.value?.Priority === player.Id,
                battlefield: cards.value.filter((card) => card.Zone === 'Battlefield' && (card.Controller ?? card.Owner) === player.Id),
                zoneCounts: {
                    Hand: player.Id === local.value?.Id ? zoneCount(player.Id, 'Hand') : revealedSoFar.value.length,
                    Graveyard: zoneCount(player.Id, 'Graveyard'),
                    Exile: zoneCount(player.Id, 'Exile'),
                    Sideboard: player.Id === local.value?.Id ? sideboard.value.length : 0,
                },
                sideboard: player.Id === local.value?.Id && startingSideboard.value !== null,
            })),
    );

    return { frame, local, opponent, cards, cardsById, turn, activeId, step, pairs, stack, hand, opponentHand, revealedSoFar, sides, playerName, startingSideboard, sideboard, discards };
}
