<?php

namespace Mymtgo\Replay\Actions;

class RepairActivePlayer
{
    /** Steps in turn order; MTGO names without a step of their own share a rank. */
    private const STEP_RANK = [
        'Untap' => 0,
        'Upkeep' => 1,
        'Draw' => 2,
        'PreCombatMain' => 3,
        'BeginCombat' => 4,
        'DeclareAttackers' => 5,
        'DeclareBlockers' => 6,
        'FirstStrikeDamage' => 7,
        'CombatDamage' => 7,
        'EndOfCombat' => 8,
        'PostCombatMain' => 9,
        'EndOfTurn' => 10,
        'Cleanup' => 11,
    ];

    private const MAIN_ONE = 3;

    /**
     * A game's frames with `ActivePlayer` naming whose turn it is.
     *
     * Sidecar recordings carry the player who went first as the active
     * player on every frame, and MTGO's `Turn` counts rounds, so neither
     * says when the second player's turn begins. Turn starts are found from
     * the frames instead: the first step, `Turn` rising, the step going back
     * to main phase 1 or earlier, or, after a turn that never left main
     * phase 1, the next player drawing on an empty stack. The active player
     * starts from the one recorded and alternates at each start.
     *
     * Frames whose active player already changes are returned as they came,
     * as are games without two players or without a recorded step.
     *
     * Spec docs/specs/2026-09-29-replay-active-player.md (api repo).
     *
     * @template TFrame of array{timestamp: string, content: array<string, mixed>}
     *
     * @param  list<TFrame>  $frames
     * @return list<TFrame>
     */
    public static function run(array $frames): array
    {
        if ($frames === []) {
            return $frames;
        }

        $seats = array_column($frames[0]['content']['Players'] ?? [], 'Id');
        $recorded = array_unique(array_filter(array_map(fn (array $frame) => $frame['content']['ActivePlayer'] ?? null, $frames), fn ($seat) => $seat !== null));

        if (count($seats) !== 2 || count($recorded) > 1) {
            return $frames;
        }

        $starts = self::turnStarts($frames, $seats);

        if ($starts === []) {
            return $frames;
        }

        $first = $frames[array_key_first($starts)]['content']['ActivePlayer'] ?? $seats[0];

        if (! in_array($first, $seats, true)) {
            return $frames;
        }

        $active = null;

        foreach ($frames as $index => $frame) {
            if (isset($starts[$index])) {
                $active = $active === null ? $first : ($active === $seats[0] ? $seats[1] : $seats[0]);
            }

            if ($active !== null) {
                $frames[$index]['content']['ActivePlayer'] = $active;
            }
        }

        return $frames;
    }

    /**
     * Frame indexes where a turn begins, as keys.
     *
     * @param  list<array{timestamp: string, content: array<string, mixed>}>  $frames
     * @param  array{0: int, 1: int}  $seats
     * @return array<int, true>
     */
    private static function turnStarts(array $frames, array $seats): array
    {
        $starts = [];
        $previousRank = null;
        $previousTurn = null;
        $previous = null;
        $pastMainOne = false;
        $turnsThisRound = 0;
        $first = null;

        foreach ($frames as $index => $frame) {
            $content = $frame['content'];
            $rank = self::STEP_RANK[$content['Step'] ?? ''] ?? null;
            $turn = $content['Turn'] ?? null;

            if ($rank !== null) {
                $first ??= $content['ActivePlayer'] ?? $seats[0];
                $newRound = $starts === [] || ($turn !== null && $previousTurn !== null && $turn > $previousTurn);
                $handover = ! $newRound && (
                    ($previousRank > self::MAIN_ONE && $rank <= self::MAIN_ONE)
                    || (! $pastMainOne && $turnsThisRound === 1 && $rank <= self::MAIN_ONE && $previous !== null && self::nextPlayerDrew($previous, $content, $first, $seats))
                );

                if ($newRound || $handover) {
                    $starts[$index] = true;
                    $pastMainOne = false;
                    $turnsThisRound = $newRound ? 1 : $turnsThisRound + 1;
                }

                if ($rank > self::MAIN_ONE) {
                    $pastMainOne = true;
                }

                $previousRank = $rank;
            }

            if ($turn !== null) {
                $previousTurn = $turn;
            }

            $previous = $content;
        }

        return $starts;
    }

    /**
     * Whether the player who is not the round's first drew exactly one card
     * between two frames, with nothing on the stack in either. A turn cannot
     * end with the stack full, which rules out instant-speed draws there.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @param  array{0: int, 1: int}  $seats
     */
    private static function nextPlayerDrew(array $before, array $after, int $first, array $seats): bool
    {
        foreach ([$before, $after] as $content) {
            foreach ($content['Cards'] ?? [] as $card) {
                if (($card['Zone'] ?? null) === 'Stack') {
                    return false;
                }
            }
        }

        $second = $first === $seats[0] ? $seats[1] : $seats[0];
        $was = self::player($before, $second);
        $now = self::player($after, $second);

        return $was !== null && $now !== null
            && ($now['HandCount'] ?? 0) - ($was['HandCount'] ?? 0) === 1
            && ($was['LibraryCount'] ?? 0) - ($now['LibraryCount'] ?? 0) === 1;
    }

    /**
     * @param  array<string, mixed>  $content
     * @return array<string, mixed>|null
     */
    private static function player(array $content, int $seat): ?array
    {
        foreach ($content['Players'] ?? [] as $player) {
            if (($player['Id'] ?? null) === $seat) {
                return $player;
            }
        }

        return null;
    }
}
