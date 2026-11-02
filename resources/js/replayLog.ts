import { type GameState, type MoveAction, type Player, type Statement, type StatementLine, type Zone } from '@mtgreplay/mtgr';
import { timeLabel } from './replayGame';
import { causeView, choiceText, manaText, objectName, targetText, zoneLabel } from './replayWords';
import type { ReplayLogItem, ReplayMoment, ReplayTurn } from './types';

/** How the log words a line. `state` is the state after the line, which is where a drawn card's name lives. */
type Describe<T extends Statement['type']> = (s: Extract<Statement, { type: T }>, state: GameState) => string;

type Describers = { [T in Statement['type']]?: Describe<T> };

const ZONE_PHRASE: Record<string, string> = {
    battlefield: 'enters the battlefield',
    graveyard: 'goes to the graveyard',
    exile: 'is exiled',
    hand: 'returns to hand',
    library: 'goes to the library',
    stack: 'goes onto the stack',
    command: 'goes to the command zone',
};

function moveText(name: string, from: Zone, to: Zone, as: MoveAction | null, owner: Player, position: 'top' | 'bottom' | null): string {
    switch (as) {
        case 'draw':
            return `${owner} draws ${name}`;
        case 'discard':
            return `${owner} discards ${name}`;
        case 'sacrifice':
            return `${owner} sacrifices ${name}`;
        case 'destroy':
            return `${name} is destroyed`;
        case 'mill':
            return `${owner} mills ${name}`;
    }

    if (to.zone === 'library') {
        return `${name} goes to the ${position ?? ''} of the library`.replace('the  of the', 'the');
    }

    if (to.zone === 'hand' && from.zone === 'library') {
        return `${owner} puts ${name} into hand`;
    }

    if (to.zone === 'outside') {
        return `${name} leaves the game (${to.label})`;
    }

    return `${name} ${ZONE_PHRASE[to.zone] ?? `moves to ${zoneLabel(to)}`}`;
}

const ptText = (pt: { power: number; toughness: number } | 'none' | '?' | null) =>
    pt === null || pt === '?' ? '?' : pt === 'none' ? 'no P/T' : `${pt.power}/${pt.toughness}`;

/**
 * One entry per statement type the log shows. Snapshot and structural lines
 * have no entry and never reach the log.
 */
const DESCRIBE: Describers = {
    pregame: () => 'Before the game',
    incomplete: (s) => `Recording incomplete: ${s.reason}`,
    'game-draw': () => 'The game is a draw',
    day: () => 'It becomes day',
    night: () => 'It becomes night',
    extension: (s) => `${s.name} ${s.args.map((arg) => (typeof arg === 'object' ? arg.keyword : String(arg))).join(' ')}`,
    'new-card': (s) => `${s.name} starts in ${zoneLabel(s.zone)}`,
    'new-hidden': (s) => `${s.owner} has a face-down card in ${zoneLabel(s.zone)}`,
    'new-token': (s) => `${s.owner} creates a ${s.name} token`,
    'new-copy': (s, state) => `${s.owner} creates a copy of ${objectName(state, s.of)}`,
    'new-ability-copy': (s) => `${s.controller} copies an ability`,
    'new-ability': (s, state) => `${objectName(state, s.of)}: ${s.text ?? `${s.kind} ability`}`,
    'new-effect': (s, state) => `Effect from ${objectName(state, s.of)}: ${s.text ?? 'lasting effect'}`,
    'new-emblem': (s) => `${s.owner} gets an emblem${s.text ? `: ${s.text}` : ''}`,
    play: (s, state) => {
        const o = state.objects[`#${s.object.id.n}`];

        return `${o?.controller ?? s.object.name} plays ${objectName(state, s.object)}${s.tapped ? ' tapped' : ''}`;
    },
    cast: (s, state) => {
        const o = state.objects[`#${s.object.id.n}`];
        const face = s.fused ? ' fused' : s.face ? ` as ${s.face}` : '';

        return `${o?.controller ?? ''} casts ${objectName(state, s.object)}${face}`.trim();
    },
    move: (s, state) => {
        const o = state.objects[`#${s.object.id.n}`];
        const extra = [s.entering.tapped ? 'tapped' : null, s.entering.pt ? ptText(s.entering.pt) : null, s.with ? `with #${s.with.n}` : null].filter(Boolean);

        return `${moveText(objectName(state, s.object), s.from, s.to, s.as, o?.owner ?? '', s.position)}${extra.length ? ` (${extra.join(', ')})` : ''}`;
    },
    choose: (s, state) => `${objectName(state, s.object)}: ${choiceText(state, s.choice)}`,
    target: (s, state) => `${objectName(state, s.object)} targets ${targetText(state, s.target)}${s.amount === null ? '' : ` (${s.amount})`}`,
    tap: (s, state) => `${objectName(state, s.object)} taps`,
    untap: (s, state) => `${objectName(state, s.object)} untaps`,
    attach: (s, state) => `${objectName(state, s.object)} attaches to ${objectName(state, s.to)}`,
    unattach: (s, state) => `${objectName(state, s.object)} becomes unattached`,
    control: (s, state) => `${s.player} gains control of ${objectName(state, s.object)}`,
    counters: (s, state) => `${objectName(state, s.object)}: ${s.kind} counters ${s.old} to ${s.new}`,
    pt: (s, state) => `${objectName(state, s.object)} becomes ${ptText(s.new)}`,
    cost: (s, state) => `${objectName(state, s.object)} costs ${manaText(s.new)}`,
    damage: (s, state) =>
        `${objectName(state, s.object)} deals ${s.amount} damage to ${targetText(state, s.to)}${s.prevented ? ' (prevented)' : ''}`,
    attack: (s, state) => `${objectName(state, s.object)} attacks ${targetText(state, s.target)}`,
    block: (s, state) => `${objectName(state, s.object)} blocks ${objectName(state, s.attacker)}`,
    reveal: (s, state) => `${objectName(state, s.object)} is revealed`,
    look: (s, state) => `${s.player} looks at ${objectName(state, s.object)}`,
    identify: (s) => `A face-down card (#${s.object.id.n}) is ${s.name}`,
    untracked: (s, state) => `${objectName(state, s.object)} is no longer tracked`,
    transform: (s, state) => `${objectName(state, s.object)} transforms`,
    'become-copy': (s, state) => `${objectName(state, s.object)} becomes a copy of ${objectName(state, s.of)}`,
    special: (s, state) => `${objectName(state, s.object)}: ${s.action}`,
    goad: (s, state) => `${objectName(state, s.object)} is goaded`,
    'end-goad': (s, state) => `${objectName(state, s.object)} is no longer goaded by ${s.player}`,
    resolve: (s, state) => `${objectName(state, s.object)} resolves`,
    fizzle: (s, state) => `${objectName(state, s.object)} fizzles`,
    countered: (s, state) => `${objectName(state, s.object)} is countered`,
    roll: (s) => `${s.player} rolls ${s.result}${s.sides ? ` on a d${s.sides}` : ''}`,
    'choose-first': (s) => (s.player === s.first ? `${s.player} chooses to play first` : `${s.player} chooses ${s.first} to play first`),
    'player-choose': (s, state) => `${s.player} chooses ${choiceText(state, s.choice)}`,
    mulligan: (s) => `${s.player} mulligans`,
    keep: (s) => `${s.player} keeps`,
    concede: (s) => `${s.player} concedes`,
    lose: (s) => `${s.player} loses the game`,
    win: (s) => `${s.player} wins the game`,
    shuffle: (s) => `${s.player} shuffles`,
    search: (s) => `${s.player} searches ${s.of ? `${s.of}'s` : 'their'} ${zoneLabel(s.zone)}`,
    add: (s) => `${s.player} adds ${manaText(s.mana)}${s.restriction ? ` (${s.restriction})` : ''}`,
    pay: (s) => `${s.player} pays ${manaText(s.mana)}`,
    'lose-mana': (s) => `${s.player} loses ${manaText(s.mana)} from the pool`,
    life: (s) => `${s.player}: ${s.old} to ${s.new} life`,
    poison: (s) => `${s.player}: ${s.old} to ${s.new} poison`,
    'player-counters': (s) => `${s.player}: ${s.kind} counters ${s.old} to ${s.new}`,
};

/** The log's wording of a line, or null for a line the log does not show. */
export function describeLine(line: StatementLine, state: GameState): string | null {
    const describe = DESCRIBE[line.statement.type] as Describe<typeof line.statement.type> | undefined;

    return describe ? describe(line.statement, state) : null;
}

/** The object a line is about, for hover previews. */
function lineObject(s: Statement): string | null {
    if ('object' in s && s.object && typeof s.object === 'object' && 'id' in s.object) {
        return `#${s.object.id.n}`;
    }

    if ('id' in s && s.id && typeof s.id === 'object' && 'n' in s.id) {
        return `#${s.id.n}`;
    }

    return null;
}

/** Log rows for the drawer: a header per turn, then each logged moment pinned to its step. */
export function buildLogItems(moments: ReplayMoment[], states: GameState[], turns: ReplayTurn[]): ReplayLogItem[] {
    const items: ReplayLogItem[] = [];

    turns.forEach((turn) => {
        if (turn.number === null) {
            return;
        }

        items.push({
            key: items.length,
            kind: 'header',
            timestamp: timeLabel(moments[turn.from]?.time ?? 0),
            text: `${turn.player} · Turn ${turn.playerTurn}`,
            step: turn.from,
            player: turn.player,
            cause: null,
            objectKey: null,
        });
    });

    moments.forEach((moment, step) => {
        if (!moment.logged) {
            return;
        }

        moment.members.forEach(({ index, line }) => {
            const state = states[index];

            if (!state || line.statement.type === 'turn') {
                return;
            }

            const text = describeLine(line, state);

            if (text === null) {
                return;
            }

            items.push({
                key: items.length,
                kind: 'line',
                timestamp: timeLabel(line.time ?? moment.time),
                text,
                step,
                player: null,
                cause: causeView(state, line.cause),
                objectKey: lineObject(line.statement),
            });
        });
    });

    return items
        .map((item, order) => ({ item, order }))
        .sort((a, b) => a.item.step - b.item.step || (a.item.kind === b.item.kind ? a.order - b.order : a.item.kind === 'header' ? -1 : 1))
        .map(({ item }, key) => ({ ...item, key }));
}
