import { getObject, idKey, type GameState, type ObjectState, type Player } from '@mtgreplay/mtgr';
import type { ReplayGameInfo } from './replayGame';
import { choiceText, targetText } from './replayWords';
import type { CardImageResolver, ReplayCardView, ReplayDerived, ReplayEffectView, ReplayPlayerView, ReplayStackItem, ReplayZone } from './types';

/** The parser's zone an HUD zone window lists. */
export const WINDOW_ZONES: Record<ReplayZone, string> = { Hand: 'hand', Graveyard: 'graveyard', Exile: 'exile', Sideboard: 'sideboard' };

/** Objects that are somewhere a board can draw them: live, and in a zone (abilities off the stack and effects are in none). */
export function liveObjects(state: GameState): ObjectState[] {
    return Object.values(state.objects).filter((object) => !object.ended && object.zone !== null);
}

/** The zone an object sits in as the windows name it; `outside "sideboard"` is the sideboard. */
export function objectZone(object: ObjectState): string | null {
    if (!object.zone) {
        return null;
    }

    return object.zone.zone === 'outside' ? object.zone.label : object.zone.zone;
}

/** The image for an object: the face showing, else the card's name. Abilities borrow their source's. */
function imageFor(object: ObjectState, state: GameState, images: CardImageResolver): string | null {
    const source = object.source ? state.objects[idKey(object.source)] : null;
    const name = object.name ?? source?.name ?? null;

    if (!name) {
        return null;
    }

    return images(name, object.face ?? undefined);
}

export function cardView(object: ObjectState, state: GameState, derived: ReplayDerived, images: CardImageResolver): ReplayCardView {
    const key = idKey(object.id);
    const source = object.source ? state.objects[idKey(object.source)] : null;
    const attacking = derived.attacking.get(key);
    const pt = object.pt !== null && object.pt !== 'none' && object.pt !== '?' ? object.pt : null;

    return {
        key,
        id: object.id,
        kind: object.kind,
        name: object.name,
        face: object.face,
        image: imageFor(object, state, images),
        text: object.text,
        sourceName: source?.name ?? null,
        owner: object.owner,
        controller: object.controller,
        tapped: object.tapped,
        power: pt?.power ?? null,
        toughness: pt?.toughness ?? null,
        counters: object.counters,
        attachedTo: object.attachedTo ? idKey(object.attachedTo) : null,
        exiledWith: object.exiledWith ? idKey(object.exiledWith) : null,
        attacking: attacking ? targetText(state, attacking) : null,
        blocking: derived.blocking.get(key) ?? null,
        damage: derived.damage.get(key) ?? 0,
        choices: object.choices,
    };
}

/** Every drawable object at this moment, keyed by id. */
export function cardViews(state: GameState, derived: ReplayDerived, images: CardImageResolver): Map<string, ReplayCardView> {
    return new Map(liveObjects(state).map((object) => [idKey(object.id), cardView(object, state, derived, images)]));
}

const POOL_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];

export function playerView(name: Player, state: GameState, derived: ReplayDerived, info: ReplayGameInfo): ReplayPlayerView {
    const player = state.players[name];
    const handCount = liveObjects(state).filter((object) => object.zone?.zone === 'hand' && object.owner === name).length;
    const clock = derived.clocks[name];

    return {
        id: name,
        name,
        local: name === info.perspective,
        life: player?.life ?? 0,
        poison: player?.poison ?? 0,
        counters: player?.counters ?? {},
        handCount,
        librarySize: player?.librarySize ?? 0,
        pool: Object.fromEntries(POOL_ORDER.map((type) => [type, player?.pool[type as keyof typeof player.pool] ?? 0]).filter(([, count]) => count)),
        clock: clock === undefined ? null : clock * 1000,
        archetype: info.archetypes[name] ?? null,
    };
}

/** Choices that read as a bare value ("green", "PlayerB"), so the stack says they were chosen. */
const CHOSEN_KINDS = new Set(['player', 'color', 'option', 'number', 'name', 'type']);

/** The stack, top first, each object with its targets and other choices worded. */
export function stackItems(state: GameState, cards: Map<string, ReplayCardView>): ReplayStackItem[] {
    return state.stack.flatMap((id) => {
        const card = cards.get(idKey(id));

        if (!card) {
            return [];
        }

        const targets = card.choices.filter((choice) => choice.kind === 'target').map((choice) => choiceText(state, choice));
        const chosen = card.choices.flatMap((choice) => {
            if (choice.kind !== 'object') {
                return [];
            }

            const name = getObject(state, choice.object.id)?.name ?? choice.object.name;

            return name ? [{ name, card: cards.get(idKey(choice.object.id)) ?? null }] : [];
        });
        const choices = card.choices
            .filter((choice) => choice.kind !== 'target' && choice.kind !== 'object')
            .map((choice) => (CHOSEN_KINDS.has(choice.kind) ? `Chose ${choiceText(state, choice)}` : choiceText(state, choice)));

        return [
            {
                card,
                title: card.name ?? card.sourceName ?? 'Unknown',
                text: card.kind === 'ability' || card.kind === 'copy' ? card.text : null,
                controller: card.controller,
                targets,
                chosen,
                choices,
            },
        ];
    });
}

/** Lasting effects and emblems in play. */
export function effectViews(state: GameState): ReplayEffectView[] {
    return Object.values(state.objects)
        .filter((object) => !object.ended && (object.kind === 'effect' || object.kind === 'emblem'))
        .map((object) => ({
            key: idKey(object.id),
            kind: object.kind as 'effect' | 'emblem',
            sourceName: object.source ? (state.objects[idKey(object.source)]?.name ?? null) : null,
            text: object.text,
            controller: object.controller,
        }));
}
