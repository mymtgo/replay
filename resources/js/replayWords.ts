import { getObject, idKey, type Cause, type Choice, type GameState, type Id, type ObjRef, type Target, type Zone } from '@mtgreplay/mtgr';
import type { ReplayCauseView } from './types';

/**
 * How the file's references read on screen. Every surface that words an
 * object, a zone, a choice or a cause goes through here, so a hidden card is
 * "a face-down card" everywhere.
 */

/** An object's name as the state knows it, falling back to the name written on the line. */
export function objectName(state: GameState, ref: ObjRef): string {
    return getObject(state, ref.id)?.name ?? abilityName(state, ref.id) ?? ref.name ?? faceDown(ref.id);
}

export function nameOf(state: GameState, id: Id): string {
    return getObject(state, id)?.name ?? abilityName(state, id) ?? faceDown(id);
}

/** An ability has no name of its own, so it reads as its source's: "Sowing Mycospawn's triggered ability". */
function abilityName(state: GameState, id: Id): string | null {
    const object = getObject(state, id);

    if (!object?.abilityKind || !object.source) {
        return null;
    }

    const source = getObject(state, object.source)?.name ?? 'a card';

    return `${source}'s ${object.abilityKind} ability`;
}

function faceDown(id: Id): string {
    return `a face-down card (${idKey(id)})`;
}

export function zoneLabel(zone: Zone): string {
    return zone.zone === 'outside' ? zone.label : zone.zone;
}

/** `{G}{C}{C}` from the parser's symbol list. */
export function manaText(mana: readonly string[]): string {
    return mana.map((symbol) => `{${symbol}}`).join('');
}

export function targetText(state: GameState, target: Target): string {
    return target.kind === 'player' ? target.player : objectName(state, target.object);
}

export function choiceText(state: GameState, choice: Choice): string {
    switch (choice.kind) {
        case 'mode':
            return `mode: ${choice.text}`;
        case 'cost':
            return choice.text;
        case 'x':
            return `X = ${choice.value}`;
        case 'symbol':
            return `{${choice.symbol}} paid with ${choice.payment === 'life' ? 'life' : `{${choice.payment}}`}`;
        case 'color':
            return choice.color;
        case 'option':
            return choice.text;
        case 'object':
            return objectName(state, choice.object);
        case 'player':
            return choice.player;
        case 'number':
            return String(choice.value);
        case 'name':
            return choice.name;
        case 'type':
            return choice.text;
        case 'hidden':
            return 'a hidden choice';
        case 'target':
            return choice.amount === null ? targetText(state, choice.target) : `${targetText(state, choice.target)} (${choice.amount})`;
    }
}

const RULE_WORDS: Record<string, string> = {
    'opening-hand': 'opening hand',
    sba: 'state-based action',
    'empty-pool': 'mana empties',
    'no-choice': 'no choice',
    'intervening-if': 'intervening if',
    'declare-attackers': 'declaring attackers',
    'replacement-order': 'replacement order',
    'delayed-trigger': 'delayed trigger',
    'day-night': 'day and night',
    'combat-damage': 'combat damage',
};

/** What made a line happen, worded for the log, with the object to link when one did. */
export function causeView(state: GameState, cause: Cause | null): ReplayCauseView | null {
    if (!cause) {
        return null;
    }

    switch (cause.by) {
        case 'object':
            return { text: nameOf(state, cause.id), objectKey: idKey(cause.id) };
        case 'cost':
            return { text: `cost of ${nameOf(state, cause.id)}`, objectKey: idKey(cause.id) };
        case 'player':
            return { text: cause.player, objectKey: null };
        case 'rule':
            return { text: RULE_WORDS[cause.rule] ?? cause.rule, objectKey: null };
        case 'source':
            return { text: cause.source === 'clock' ? 'the clock' : 'a disconnect', objectKey: null };
        case 'unknown':
            return { text: 'unknown', objectKey: null };
    }
}
