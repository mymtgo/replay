<?php

use Mymtgo\Replay\Actions\BuildReplaySnapshot;
use Mymtgo\Replay\Actions\RepairActivePlayer;

/**
 * One frame of a two player game, seats 1 and 2, recorded with seat 1 as
 * the active player throughout the way the sidecar records it.
 *
 * @param  array{0: int, 1: int}  $hands
 * @param  array{0: int, 1: int}  $libraries
 * @return array{timestamp: string, content: array<string, mixed>}
 */
function activeFrame(?int $turn, ?string $step, array $hands = [7, 7], array $libraries = [53, 53], bool $stack = false, ?int $active = 1): array
{
    return [
        'timestamp' => '12:00:00',
        'content' => array_filter([
            'Turn' => $turn,
            'Step' => $step,
            'ActivePlayer' => $active,
            'Players' => [
                ['Id' => 1, 'Name' => 'first.player', 'HandCount' => $hands[0], 'LibraryCount' => $libraries[0]],
                ['Id' => 2, 'Name' => 'second.player', 'HandCount' => $hands[1], 'LibraryCount' => $libraries[1]],
            ],
            'Cards' => $stack ? [['Id' => 10, 'CatalogID' => 1234, 'Zone' => 'Stack', 'Owner' => 2]] : [],
        ], fn ($value) => $value !== null),
    ];
}

/**
 * @param  list<array{timestamp: string, content: array<string, mixed>}>  $frames
 * @return list<?int>
 */
function activePlayers(array $frames): array
{
    return array_map(fn (array $frame) => $frame['content']['ActivePlayer'] ?? null, RepairActivePlayer::run($frames));
}

it('hands the turn over when the step goes back and when the round changes', function () {
    $frames = [
        activeFrame(1, null),
        activeFrame(1, 'Upkeep'),
        activeFrame(1, 'PreCombatMain'),
        activeFrame(1, 'EndOfTurn'),
        activeFrame(1, 'Upkeep'),
        activeFrame(1, 'PostCombatMain'),
        activeFrame(2, 'Upkeep'),
    ];

    expect(activePlayers($frames))->toBe([1, 1, 1, 1, 2, 2, 1]);
});

it('counts a round change even when the step does not go back', function () {
    $frames = [
        activeFrame(1, 'Upkeep'),
        activeFrame(1, 'EndOfTurn'),
        activeFrame(1, 'PreCombatMain'),
        activeFrame(2, 'PreCombatMain'),
    ];

    expect(activePlayers($frames))->toBe([1, 1, 2, 1]);
});

it('hands a main-phase-only turn over on the next player drawing', function () {
    $frames = [
        activeFrame(1, 'PreCombatMain', [7, 6], [53, 53]),
        activeFrame(1, 'PreCombatMain', [6, 6], [53, 53]),
        activeFrame(1, 'PreCombatMain', [6, 7], [53, 52]),
        activeFrame(1, 'PreCombatMain', [6, 8], [53, 51]),
    ];

    expect(activePlayers($frames))->toBe([1, 1, 2, 2]);
});

it('ignores a draw with something on the stack', function () {
    $frames = [
        activeFrame(1, 'PreCombatMain', [6, 6], [53, 53], stack: true),
        activeFrame(1, 'PreCombatMain', [6, 7], [53, 52], stack: true),
    ];

    expect(activePlayers($frames))->toBe([1, 1]);
});

it('ignores a draw once the turn has gone past main phase 1', function () {
    $frames = [
        activeFrame(1, 'Upkeep'),
        activeFrame(1, 'BeginCombat'),
        activeFrame(1, 'CombatDamage', [7, 8], [53, 52]),
    ];

    expect(activePlayers($frames))->toBe([1, 1, 1]);
});

it('starts from the recorded player, who went first', function () {
    $frames = [activeFrame(1, 'Upkeep', active: 2), activeFrame(1, 'EndOfTurn', active: 2), activeFrame(1, 'Upkeep', active: 2)];

    expect(activePlayers($frames))->toBe([2, 2, 1]);
});

it('leaves frames whose active player already changes alone', function () {
    $frames = [activeFrame(1, 'Upkeep', active: 1), activeFrame(1, 'EndOfTurn', active: 1), activeFrame(1, 'Upkeep', active: 2), activeFrame(1, 'PostCombatMain', active: 1)];

    expect(RepairActivePlayer::run($frames))->toBe($frames);
});

it('leaves games without steps alone', function () {
    $frames = [activeFrame(null, null, active: null), activeFrame(null, null, active: null)];

    expect(RepairActivePlayer::run($frames))->toBe($frames)
        ->and(RepairActivePlayer::run([]))->toBe([]);
});

it('builds snapshots with the active player repaired', function () {
    $timeline = [activeFrame(1, 'Upkeep'), activeFrame(1, 'EndOfTurn'), activeFrame(1, 'Upkeep')];

    $snapshot = BuildReplaySnapshot::run(buildMatchInput([buildGameInput($timeline)]), buildCardResolver());

    expect(array_map(fn (array $frame) => $frame['content']['ActivePlayer'], $snapshot['games'][0]['frames']))->toBe([1, 1, 2]);
});
