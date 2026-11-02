import { getObject, type Game, type GameState, type Player, type StatementLine } from '@mtgreplay/mtgr';
import { describeLine } from './replayLog';
import { liveObjects } from './replayState';
import { causeView } from './replayWords';
import type { ReplayMoment } from './types';

export type PregameRoll = { player: Player; result: number; sides: number | null; /** The die face to draw: a d6 result; null for any other roll, which is shown as a number. */ face: number | null };

/** One go at the roll for who chooses: each player rolls once, and a tie starts another round. */
export type PregameRound = {
    rolls: PregameRoll[];
    /** The player with the highest roll; null while a roll is missing or after a tie. */
    winner: Player | null;
    tied: boolean;
};

export type PregamePlayer = {
    name: Player;
    mulligans: number;
    /** Cards put on the bottom after the latest mulligan: their names, null for a card nobody has seen. */
    bottomed: (string | null)[];
    /** Hand size when they kept; null until they do. */
    keptWith: number | null;
    /** Their roll in the latest round, once made. */
    roll: PregameRoll | null;
};

export type PregameView = {
    /** The latest round of the roll, with the rounds before it tied. */
    round: PregameRound | null;
    rerolls: number;
    /** Who chose and who goes first; null before the choice. */
    first: { chooser: Player; first: Player } | null;
    players: PregamePlayer[];
    /** The opening-hand action the moment shows, such as a Leyline entering play, worded. */
    action: string | null;
};

function roundOf(rolls: PregameRoll[], seats: number): PregameRound {
    const best = Math.max(...rolls.map((roll) => roll.result));
    const leaders = rolls.filter((roll) => roll.result === best);
    const complete = rolls.length >= seats;

    return { rolls, winner: complete && leaders.length === 1 ? leaders[0].player : null, tied: complete && leaders.length > 1 };
}

/** Opening-hand actions the pregame shows as they happen: not the draws and mulligan moves the hands already show. */
function actionText(members: ReplayMoment['members'], states: readonly GameState[]): string | null {
    const { index, line } = members[0];
    const state = states[index];

    if (!state) {
        return null;
    }

    if (members.length > 1) {
        const s = line.statement;
        const cause = causeView(state, line.cause);
        const by = cause ? ` (${cause.text})` : '';

        if (s.type !== 'move' || s.as === 'draw' || line.cause?.by === 'rule') {
            return null;
        }

        return s.to.zone === 'exile' ? `${members.length} cards are exiled${by}` : s.to.zone === 'battlefield' ? `${members.length} cards enter the battlefield${by}` : null;
    }

    const s = line.statement;
    const shown = s.type === 'reveal' || s.type === 'identify' || s.type === 'play' || (s.type === 'move' && s.as !== 'draw' && line.cause?.by !== 'rule');

    if (!shown) {
        return null;
    }

    const text = describeLine(line, state);
    const cause = causeView(state, line.cause);
    const own = 'object' in s && cause?.objectKey === `#${s.object.id.n}`;

    return text && cause && !own ? `${text} (${cause.text})` : text;
}

function handSize(state: GameState, player: Player): number {
    return liveObjects(state).filter((object) => object.zone?.zone === 'hand' && object.owner === player).length;
}

/**
 * What the pregame has settled to at the end of `moment`: the roll, who chose,
 * and each player's mulligans and keep. `states` is the replay state after
 * each body line. Null when nothing has happened yet, or the line is past the
 * first turn.
 */
export function pregameView(game: Game, states: readonly GameState[], moment: ReplayMoment, seats: readonly Player[]): PregameView | null {
    const upTo = moment.index;
    const rounds: PregameRound[] = [];
    let rolls: PregameRoll[] = [];
    let first: PregameView['first'] = null;
    const players = new Map<Player, PregamePlayer>(seats.map((name) => [name, { name, mulligans: 0, bottomed: [], keptWith: null, roll: null }]));

    for (let index = 0; index <= upTo && index < game.body.length; index++) {
        const line = game.body[index];

        if (line.kind !== 'statement' || line.variation) {
            continue;
        }

        const s = line.statement;
        const state = states[index];

        if (s.type === 'turn') {
            return null;
        }

        if (s.type === 'roll') {
            if (rolls.length >= seats.length || rolls.some((roll) => roll.player === s.player)) {
                rounds.push(roundOf(rolls, seats.length));
                rolls = [];
            }

            rolls.push({ player: s.player, result: s.result, sides: s.sides, face: (s.sides ?? 6) === 6 && s.result >= 1 && s.result <= 6 ? s.result : null });
        } else if (s.type === 'choose-first') {
            first = { chooser: s.player, first: s.first };
        } else if (s.type === 'mulligan') {
            const player = players.get(s.player);

            if (player) {
                player.mulligans++;
                player.bottomed = [];
                player.keptWith = null;
            }
        } else if (s.type === 'keep') {
            const player = players.get(s.player);

            if (player && state) {
                player.keptWith = handSize(state, s.player);
            }
        } else if (s.type === 'move' && s.to.zone === 'library' && s.from.zone === 'hand' && s.position === 'bottom' && line.cause?.by === 'rule' && line.cause.rule === 'mulligan') {
            const object = state ? getObject(state, s.object.id) : undefined;
            const player = object ? players.get(object.owner) : undefined;

            player?.bottomed.push(object?.name ?? null);
        }
    }

    const action = actionText(moment.members, states);

    const round = rolls.length ? roundOf(rolls, seats.length) : null;
    const list = [...players.values()].map((player) => ({ ...player, roll: round?.rolls.find((roll) => roll.player === player.name) ?? null }));

    if (!round && !rounds.length && !first && !action && list.every((player) => !player.mulligans && player.keptWith === null)) {
        return null;
    }

    return { round, rerolls: rounds.length, first, players: list, action };
}

export type PregameBadge = { text: string; tone: 'win' | 'warn' | 'plain' };

/** What the pregame panel says under a player, in the order it happened. */
export function pregameBadges(view: PregameView, name: Player): PregameBadge[] {
    const player = view.players.find((item) => item.name === name);
    const badges: PregameBadge[] = [];

    if (view.round?.winner === name) {
        badges.push({ text: 'Won die roll', tone: 'win' });
    }

    if (view.round?.tied) {
        badges.push({ text: 'Tied, rolling again', tone: 'plain' });
    }

    if (view.first) {
        badges.push({ text: view.first.first === name ? 'On the play' : 'On the draw', tone: 'plain' });
    }

    if (player?.mulligans) {
        badges.push({ text: player.mulligans > 1 ? `Mulligan x${player.mulligans}` : 'Mulligan', tone: 'warn' });
    }

    if (player?.keptWith != null) {
        badges.push({ text: `Keeps ${player.keptWith}`, tone: 'win' });
    }

    return badges;
}
