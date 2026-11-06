import { getObject, idKey, type GameState, type ObjectState, type Player, type Target } from '@mtgreplay/mtgr';
import type { ReplayGameInfo } from './replayGame';
import { choiceText, displayName, targetText } from './replayWords';
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

/** The other part of a `FRONT // BACK` name than `face` (null for the front), or undefined when the name has one part. */
function otherFace(name: string, face: string | null): string | null | undefined {
    const parts = name.split(' // ');

    if (parts.length < 2) {
        return undefined;
    }

    return face === null || face === parts[0] ? parts[1] : null;
}

/**
 * The image of `face` of an object (null for the front: a face equal to the
 * front is no face, spec 7.1). Abilities borrow their source's. The card's
 * source ids go along with the face unless it is a copy, whose name is not the
 * card they name: a source id names the card, and the face picks its side.
 */
function imageFor(object: ObjectState, face: string | null, state: GameState, images: CardImageResolver, sources: ReadonlyMap<string, readonly string[]>): string | null {
    const card = object.name || object.nameUnknown ? object : object.source ? state.objects[idKey(object.source)] : null;

    // A `?` card has no name to look up: the host may know it by its source ids.
    if (card?.nameUnknown) {
        return card.src.length > 0 ? images(null, undefined, card.src) : null;
    }

    const name = card?.name ?? null;

    if (!card || !name) {
        return null;
    }

    const shown = face === null || face === name.split(' // ')[0] ? undefined : face;
    const ids = card.name === card.ownName ? sources.get(idKey(card.id)) : undefined;

    return ids ? images(name, shown, ids) : images(name, shown);
}

/** The image of a multi-faced card's face that is not showing; undefined for a card with one face, or one whose name is unknown. */
function otherImageFor(object: ObjectState, state: GameState, images: CardImageResolver, sources: ReadonlyMap<string, readonly string[]>): string | null | undefined {
    const other = object.name && !object.nameUnknown ? otherFace(object.name, object.face) : undefined;

    return other === undefined ? undefined : imageFor(object, other, state, images, sources);
}

/** How many creatures attack what `matches` picks out this combat. */
function attackersOf(derived: ReplayDerived, matches: (target: Target) => boolean): number {
    return [...derived.attacking.values()].filter(matches).length;
}

export function cardView(
    object: ObjectState,
    state: GameState,
    derived: ReplayDerived,
    images: CardImageResolver,
    sources: ReadonlyMap<string, readonly string[]> = new Map(),
): ReplayCardView {
    const key = idKey(object.id);
    const source = object.source ? state.objects[idKey(object.source)] : null;
    const attacking = derived.attacking.get(key);
    const pt = object.pt !== null && object.pt !== 'none' && object.pt !== '?' ? object.pt : null;

    return {
        key,
        id: object.id,
        kind: object.kind,
        name: displayName(object),
        nameUnknown: object.nameUnknown,
        face: object.face,
        types: object.types,
        image: imageFor(object, object.face, state, images, sources),
        otherImage: otherImageFor(object, state, images, sources),
        text: object.text,
        sourceName: displayName(source),
        owner: object.owner,
        controller: object.controller,
        tapped: object.tapped,
        power: pt?.power ?? null,
        toughness: pt?.toughness ?? null,
        counters: object.counters,
        attachedTo: object.attachedTo ? idKey(object.attachedTo) : null,
        exiledWith: object.exiledWith ? idKey(object.exiledWith) : null,
        attacking: attacking
            ? attacking.kind === 'player'
                ? { kind: 'player', player: attacking.player, label: attacking.player }
                : { kind: 'object', key: idKey(attacking.object.id), label: state.objects[idKey(attacking.object.id)]?.face ?? targetText(state, attacking) }
            : null,
        attackers: attackersOf(derived, (target) => target.kind === 'object' && idKey(target.object.id) === key),
        blocking: derived.blocking.get(key) ?? null,
        damage: derived.damage.get(key) ?? 0,
        choices: object.choices,
    };
}

/** Every drawable object at this moment, keyed by id. */
export function cardViews(
    state: GameState,
    derived: ReplayDerived,
    images: CardImageResolver,
    sources: ReadonlyMap<string, readonly string[]> = new Map(),
): Map<string, ReplayCardView> {
    return new Map(liveObjects(state).map((object) => [idKey(object.id), cardView(object, state, derived, images, sources)]));
}

const POOL_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];

/** Seconds left on a player's clock at this line: its last recorded value, less the time since while they hold priority. Null when none is recorded. */
export function clockLeft(d: ReplayDerived, player: Player): number | null {
    const clock = d.clocks[player];

    if (!clock) {
        return null;
    }

    return d.priority === player ? Math.max(0, clock.left - (d.time - clock.at)) : clock.left;
}

export function playerView(name: Player, state: GameState, derived: ReplayDerived, info: ReplayGameInfo): ReplayPlayerView {
    const player = state.players[name];
    const handCount = liveObjects(state).filter((object) => object.zone?.zone === 'hand' && object.owner === name).length;
    const clock = clockLeft(derived, name);

    return {
        id: name,
        name,
        local: name === info.perspective,
        life: player?.life ?? 0,
        poison: player?.poison ?? 0,
        counters: player?.counters ?? {},
        handCount,
        attackers: attackersOf(derived, (target) => target.kind === 'player' && target.player === name),
        librarySize: player?.librarySize ?? 0,
        pool: Object.fromEntries(POOL_ORDER.map((type) => [type, player?.pool[type as keyof typeof player.pool] ?? 0]).filter(([, count]) => count)),
        clock: clock === null ? null : clock * 1000,
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

            const name = displayName(getObject(state, choice.object.id)) ?? choice.object.name;

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
            sourceName: object.source ? displayName(state.objects[idKey(object.source)]) : null,
            text: object.text,
            controller: object.controller,
        }));
}
