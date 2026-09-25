<?php

use Mymtgo\Replay\Actions\BuildReplaySnapshot;

/**
 * One timeline row with local.player (Id 1) against Opp_Name (Id 2) and a
 * single card of the given catalog id.
 *
 * @return array{timestamp: string, content: array<string, mixed>}
 */
function buildTimelineRow(int $catalogId = 1234, string $timestamp = '2026-09-20T18:00:01+00:00'): array
{
    return [
        'timestamp' => $timestamp,
        'content' => [
            'Players' => [['Id' => 1, 'Name' => 'local.player'], ['Id' => 2, 'Name' => 'Opp_Name']],
            'Cards' => [['Id' => 10, 'CatalogID' => $catalogId, 'Zone' => 'Battlefield', 'Owner' => 2]],
        ],
    ];
}

/**
 * @param  list<array<string, mixed>>  $games
 * @return array<string, mixed>
 */
function buildMatchInput(array $games, ?string $format = 'CMODERN'): array
{
    return [
        'format' => $format,
        'played_at' => '2026-09-20T18:00:00+00:00',
        'local_archetype' => 'Boros Energy',
        'opponent_archetype' => null,
        'games' => $games,
    ];
}

/** @return array<string, mixed> */
function buildGameInput(array $timeline, ?bool $won = true, array $log = []): array
{
    return ['won' => $won, 'local_username' => 'local.player', 'timeline' => $timeline, 'log' => $log];
}

function buildCardResolver(): Closure
{
    return fn (array $ids) => [
        1234 => ['name' => 'Ragavan, Nimble Pilferer', 'type' => 'Legendary Creature', 'image' => 'https://cards.scryfall.io/a.jpg'],
        5678 => ['name' => 'Island', 'type' => 'Basic Land', 'image' => 'http://127.0.0.1:8100/local.jpg'],
    ];
}

it('builds a version 2 snapshot with head metadata', function () {
    $snapshot = BuildReplaySnapshot::run(buildMatchInput([buildGameInput([buildTimelineRow()])]), buildCardResolver());

    expect($snapshot['version'])->toBe(2)
        ->and($snapshot['meta'])->toBe([
            'format' => 'modern',
            'played_at' => '2026-09-20T18:00:00+00:00',
            'games_in_match' => 1,
            'local_archetype' => 'Boros Energy',
            'opponent_archetype' => null,
        ]);
});

it('marks the local player and fills card fields in every frame', function () {
    $snapshot = BuildReplaySnapshot::run(buildMatchInput([buildGameInput([buildTimelineRow()])]), buildCardResolver());
    $content = $snapshot['games'][0]['frames'][0]['content'];

    expect($content['Players'][0]['IsLocal'])->toBeTrue()
        ->and($content['Players'][1]['IsLocal'])->toBeFalse()
        ->and($content['Cards'][0]['name'])->toBe('Ragavan, Nimble Pilferer')
        ->and($content['Cards'][0]['type'])->toBe('Legendary Creature')
        ->and($content['Cards'][0]['image'])->toBe('https://cards.scryfall.io/a.jpg');
});

it('drops an image that is not a remote https url', function () {
    $snapshot = BuildReplaySnapshot::run(buildMatchInput([buildGameInput([buildTimelineRow(5678)])]), buildCardResolver());

    expect($snapshot['games'][0]['frames'][0]['content']['Cards'][0]['image'])->toBeNull()
        ->and($snapshot['games'][0]['frames'][0]['content']['Cards'][0]['name'])->toBe('Island');
});

it('leaves unknown cards with null fields', function () {
    $snapshot = BuildReplaySnapshot::run(buildMatchInput([buildGameInput([buildTimelineRow(999)])]), buildCardResolver());
    $card = $snapshot['games'][0]['frames'][0]['content']['Cards'][0];

    expect($card['name'])->toBeNull()->and($card['type'])->toBeNull()->and($card['image'])->toBeNull();
});

it('names a card the catalog cannot resolve with the name MTGO gave it', function () {
    $row = buildTimelineRow(999);
    $row['content']['Cards'][0]['Name'] = 'Eldrazi Spawn';

    $snapshot = BuildReplaySnapshot::run(buildMatchInput([buildGameInput([$row])]), buildCardResolver());
    $card = $snapshot['games'][0]['frames'][0]['content']['Cards'][0];

    expect($card['name'])->toBe('Eldrazi Spawn')->and($card)->not->toHaveKey('Name');
});

it('keeps a hidden card nameless even when MTGO sent a name', function () {
    $row = buildTimelineRow(0);
    $row['content']['Cards'][0]['Name'] = 'Ragavan, Nimble Pilferer';

    $snapshot = BuildReplaySnapshot::run(buildMatchInput([buildGameInput([$row])]), buildCardResolver());

    expect($snapshot['games'][0]['frames'][0]['content']['Cards'][0]['name'])->toBeNull();
});

it('skips frameless games but keeps their place in the numbering', function () {
    $snapshot = BuildReplaySnapshot::run(buildMatchInput([
        buildGameInput([], won: false),
        buildGameInput([buildTimelineRow()], won: true),
    ]), buildCardResolver());

    // Two games played, only game 2 has frames, so it keeps number 2.
    expect($snapshot['games'])->toHaveCount(1)
        ->and($snapshot['games'][0]['game_number'])->toBe(2)
        ->and($snapshot['games'][0]['won'])->toBeTrue()
        ->and($snapshot['meta']['games_in_match'])->toBe(2);
});

it('passes the log through untouched', function () {
    $log = [['timestamp' => '18:00:01', 'message' => 'Opp_Name casts Ragavan, Nimble Pilferer.']];
    $snapshot = BuildReplaySnapshot::run(buildMatchInput([buildGameInput([buildTimelineRow()], log: $log)]), buildCardResolver());

    expect($snapshot['games'][0]['log'])->toBe($log);
});

it('asks the resolver once per game with each catalog id once', function () {
    $calls = [];
    $resolver = function (array $ids) use (&$calls) {
        $calls[] = $ids;

        return [];
    };

    BuildReplaySnapshot::run(buildMatchInput([buildGameInput([buildTimelineRow(1234), buildTimelineRow(1234), buildTimelineRow(5678)])]), $resolver);

    expect($calls)->toBe([[1234, 5678]]);
});

it('reduces format codes to the archetype key', function (?string $format, string $expected) {
    expect(BuildReplaySnapshot::formatKey($format))->toBe($expected);
})->with([
    'constructed code' => ['CMODERN', 'modern'],
    'mixed case code' => ['CModern', 'modern'],
    'bare name' => ['Modern', 'modern'],
    'commander is a name, not a code' => ['Commander', 'commander'],
    'null' => [null, ''],
]);

it('writes a null format when there is none', function () {
    $snapshot = BuildReplaySnapshot::run(buildMatchInput([buildGameInput([buildTimelineRow()])], format: null), buildCardResolver());

    expect($snapshot['meta']['format'])->toBeNull();
});

it('carries your sideboard as the game began, with card fields filled', function () {
    $game = buildGameInput([buildTimelineRow()]) + ['sideboard' => [['mtgo_id' => 1234, 'quantity' => 2], ['mtgo_id' => 5678, 'quantity' => 1]]];

    $snapshot = BuildReplaySnapshot::run(buildMatchInput([$game]), buildCardResolver());

    expect($snapshot['games'][0]['sideboard'])->toBe([
        ['catalog_id' => 1234, 'quantity' => 2, 'name' => 'Ragavan, Nimble Pilferer', 'type' => 'Legendary Creature', 'image' => 'https://cards.scryfall.io/a.jpg'],
        ['catalog_id' => 5678, 'quantity' => 1, 'name' => 'Island', 'type' => 'Basic Land', 'image' => null],
    ]);
});

it('leaves the sideboard out when the game has none recorded', function () {
    $snapshot = BuildReplaySnapshot::run(buildMatchInput([
        buildGameInput([buildTimelineRow()]),
        buildGameInput([buildTimelineRow()]) + ['sideboard' => []],
    ]), buildCardResolver());

    expect($snapshot['games'][0])->not->toHaveKey('sideboard')
        ->and($snapshot['games'][1])->not->toHaveKey('sideboard');
});

it('resolves sideboard cards the timeline never shows', function () {
    $asked = [];
    $cards = function (array $ids) use (&$asked) {
        $asked = $ids;

        return [];
    };

    BuildReplaySnapshot::run(buildMatchInput([buildGameInput([buildTimelineRow()]) + ['sideboard' => [['mtgo_id' => 999, 'quantity' => 1]]]]), $cards);

    expect($asked)->toContain(999)->toContain(1234);
});
