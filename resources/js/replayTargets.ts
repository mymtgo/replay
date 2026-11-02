import { idKey, type Choice, type Player } from '@mtgreplay/mtgr';
import { WINDOW_ZONES } from './replayState';
import type { ReplayCardView, ReplayZone } from './types';

/**
 * What a stack entry's targets mark on the board, as one set of keys every
 * surface asks by name: an object by its id key (`#12`, which a battlefield
 * tile, a stack entry or a hand card matches), a player by `player:Name`, and
 * a zone that holds a target by `zone:Owner:Graveyard`.
 */
export type TargetMarks = ReadonlySet<string>;

export const NO_MARKS: TargetMarks = new Set();

export const playerMark = (player: Player): string => `player:${player}`;
export const zoneMark = (owner: Player, zone: ReplayZone): string => `zone:${owner}:${zone}`;

const MARKED_ZONES = new Map<string, ReplayZone>(
    (['Hand', 'Graveyard', 'Exile'] as const).map((zone) => [WINDOW_ZONES[zone], zone]),
);

/**
 * The marks for a stack object's choices: every `target`, or only the one at
 * `only` when a single target line is being pointed at. A target that is no
 * longer anywhere (it ended or was never known) still marks its key, which
 * nothing draws, so a gone target shows nothing extra.
 */
export function targetMarks(
    choices: readonly Choice[],
    zones: ReadonlyMap<string, string | null>,
    cards: ReadonlyMap<string, ReplayCardView>,
    only: number | null = null,
): TargetMarks {
    const targets = choices.filter((choice) => choice.kind === 'target').map((choice) => choice.target);
    const marks = new Set<string>();

    targets.forEach((target, i) => {
        if (only !== null && i !== only) {
            return;
        }

        if (target.kind === 'player') {
            marks.add(playerMark(target.player));

            return;
        }

        const key = idKey(target.object.id);
        const zone = MARKED_ZONES.get(zones.get(key) ?? '');
        const owner = cards.get(key)?.owner;

        marks.add(key);

        if (zone && owner) {
            marks.add(zoneMark(owner, zone));
        }
    });

    return marks;
}
