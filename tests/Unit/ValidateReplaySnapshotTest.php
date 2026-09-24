<?php

use Illuminate\Validation\ValidationException;
use Mymtgo\Replay\Actions\ValidateReplaySnapshot;

it('accepts a valid snapshot and returns it unchanged', function () {
    $snapshot = replaySnapshot();

    expect(ValidateReplaySnapshot::run($snapshot))->toBe($snapshot);
});

it('accepts a card with no image', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['frames'][0]['content']['Cards'][0]['image'] = null;

    expect(ValidateReplaySnapshot::run($snapshot))->toBe($snapshot);
});

it('accepts a frame with no cards and an empty log', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['frames'][0]['content']['Cards'] = [];
    $snapshot['games'][0]['log'] = [];

    expect(ValidateReplaySnapshot::run($snapshot))->toBe($snapshot);
});

it('rejects a snapshot with the wrong version', function () {
    ValidateReplaySnapshot::run(replaySnapshot(['version' => 1]));
})->throws(ValidationException::class);

it('rejects a snapshot with no frames', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['frames'] = [];

    ValidateReplaySnapshot::run($snapshot);
})->throws(ValidationException::class);

it('rejects a snapshot with missing top-level keys', function (string $key) {
    $snapshot = replaySnapshot();
    unset($snapshot[$key]);

    ValidateReplaySnapshot::run($snapshot);
})->with(['version', 'meta', 'games'])->throws(ValidationException::class);

it('rejects a match with no games', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'] = [];

    ValidateReplaySnapshot::run($snapshot);
})->throws(ValidationException::class);

it('rejects a game missing its own keys', function (string $key) {
    $snapshot = replaySnapshot();
    unset($snapshot['games'][0][$key]);

    ValidateReplaySnapshot::run($snapshot);
})->with(['game_number', 'won', 'frames', 'log'])->throws(ValidationException::class);

it('accepts several games', function () {
    $snapshot = replaySnapshot();
    $second = $snapshot['games'][0];
    $second['game_number'] = 2;
    $second['won'] = null;
    $snapshot['games'][] = $second;

    expect(ValidateReplaySnapshot::run($snapshot))->toBe($snapshot);
});

it('rejects bad meta', function (string $key, mixed $value) {
    $snapshot = replaySnapshot();
    $snapshot['meta'][$key] = $value;

    ValidateReplaySnapshot::run($snapshot);
})->with([
    ['played_at', null],
    ['games_in_match', 0],
    ['games_in_match', 'three'],
    ['format', 12],
])->throws(ValidationException::class);

it('rejects a player without an integer Id or string Name', function (array $player) {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['frames'][0]['content']['Players'][0] = $player;

    ValidateReplaySnapshot::run($snapshot);
})->with([
    [['Id' => '1', 'Name' => 'local.player']],
    [['Id' => 1]],
])->throws(ValidationException::class);

it('rejects a card missing a required key', function (string $key) {
    $snapshot = replaySnapshot();
    unset($snapshot['games'][0]['frames'][0]['content']['Cards'][0][$key]);

    ValidateReplaySnapshot::run($snapshot);
})->with(['Id', 'CatalogID', 'Zone', 'Owner'])->throws(ValidationException::class);

it('rejects a card image that is not a remote https url', function (string $image) {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['frames'][0]['content']['Cards'][0]['image'] = $image;

    ValidateReplaySnapshot::run($snapshot);
})->with([
    'http://127.0.0.1:8100/storage/cards/ab.jpg',
    'http://localhost/storage/cards/ab.jpg',
    '/storage/cards/ab.jpg',
])->throws(ValidationException::class);

it('rejects a log entry without a message', function () {
    $snapshot = replaySnapshot();
    unset($snapshot['games'][0]['log'][0]['message']);

    ValidateReplaySnapshot::run($snapshot);
})->throws(ValidationException::class);

it('names the offending path in the error', function () {
    $snapshot = replaySnapshot();
    unset($snapshot['games'][0]['frames'][0]['content']['Cards'][0]['Zone']);

    try {
        ValidateReplaySnapshot::run($snapshot);
    } catch (ValidationException $e) {
        expect($e->errors())->toHaveKey('games.0.frames.0.content.Cards.0.Zone');

        return;
    }

    $this->fail('Expected a ValidationException.');
});

it('accepts a game carrying your sideboard', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['sideboard'] = [
        ['catalog_id' => 1234, 'quantity' => 2, 'name' => 'Duress', 'type' => 'Sorcery', 'image' => 'https://cards.scryfall.io/d.jpg'],
        ['catalog_id' => 5678, 'quantity' => 1, 'name' => null, 'type' => null, 'image' => null],
    ];

    expect(ValidateReplaySnapshot::run($snapshot))->toBe($snapshot);
});

it('rejects a malformed sideboard', function (mixed $sideboard) {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['sideboard'] = $sideboard;

    ValidateReplaySnapshot::run($snapshot);
})->with([
    'not a list' => [['a' => 1]],
    'zero quantity' => [[['catalog_id' => 1, 'quantity' => 0, 'name' => null, 'type' => null, 'image' => null]]],
    'string id' => [[['catalog_id' => '1', 'quantity' => 1, 'name' => null, 'type' => null, 'image' => null]]],
    'local image' => [[['catalog_id' => 1, 'quantity' => 1, 'name' => null, 'type' => null, 'image' => 'http://127.0.0.1/x.jpg']]],
    'numeric name' => [[['catalog_id' => 1, 'quantity' => 1, 'name' => 5, 'type' => null, 'image' => null]]],
])->throws(ValidationException::class);
