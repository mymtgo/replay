<?php

use Illuminate\Validation\ValidationException;
use Mymtgo\Replay\Actions\ValidateReplaySnapshot;

it('accepts a valid snapshot and returns it unchanged', function () {
    $snapshot = replaySnapshot();

    expect(ValidateReplaySnapshot::run($snapshot))->toBe($snapshot);
});

it('accepts a card with no image', function () {
    $snapshot = replaySnapshot();
    $snapshot['frames'][0]['content']['Cards'][0]['image'] = null;

    expect(ValidateReplaySnapshot::run($snapshot))->toBe($snapshot);
});

it('accepts a frame with no cards and an empty log', function () {
    $snapshot = replaySnapshot();
    $snapshot['frames'][0]['content']['Cards'] = [];
    $snapshot['log'] = [];

    expect(ValidateReplaySnapshot::run($snapshot))->toBe($snapshot);
});

it('rejects a snapshot with the wrong version', function () {
    ValidateReplaySnapshot::run(replaySnapshot(['version' => 2]));
})->throws(ValidationException::class);

it('rejects a snapshot with no frames', function () {
    $snapshot = replaySnapshot();
    $snapshot['frames'] = [];

    ValidateReplaySnapshot::run($snapshot);
})->throws(ValidationException::class);

it('rejects a snapshot with missing top-level keys', function (string $key) {
    $snapshot = replaySnapshot();
    unset($snapshot[$key]);

    ValidateReplaySnapshot::run($snapshot);
})->with(['version', 'won', 'meta', 'frames', 'log'])->throws(ValidationException::class);

it('rejects bad meta', function (string $key, mixed $value) {
    $snapshot = replaySnapshot();
    $snapshot['meta'][$key] = $value;

    ValidateReplaySnapshot::run($snapshot);
})->with([
    ['played_at', null],
    ['game_number', 0],
    ['games_in_match', 'three'],
    ['format', 12],
])->throws(ValidationException::class);

it('rejects a player without an integer Id or string Name', function (array $player) {
    $snapshot = replaySnapshot();
    $snapshot['frames'][0]['content']['Players'][0] = $player;

    ValidateReplaySnapshot::run($snapshot);
})->with([
    [['Id' => '1', 'Name' => 'local.player']],
    [['Id' => 1]],
])->throws(ValidationException::class);

it('rejects a card missing a required key', function (string $key) {
    $snapshot = replaySnapshot();
    unset($snapshot['frames'][0]['content']['Cards'][0][$key]);

    ValidateReplaySnapshot::run($snapshot);
})->with(['Id', 'CatalogID', 'Zone', 'Owner'])->throws(ValidationException::class);

it('rejects a card image that is not a remote https url', function (string $image) {
    $snapshot = replaySnapshot();
    $snapshot['frames'][0]['content']['Cards'][0]['image'] = $image;

    ValidateReplaySnapshot::run($snapshot);
})->with([
    'http://127.0.0.1:8100/storage/cards/ab.jpg',
    'http://localhost/storage/cards/ab.jpg',
    '/storage/cards/ab.jpg',
])->throws(ValidationException::class);

it('rejects a log entry without a message', function () {
    $snapshot = replaySnapshot();
    unset($snapshot['log'][0]['message']);

    ValidateReplaySnapshot::run($snapshot);
})->throws(ValidationException::class);

it('names the offending path in the error', function () {
    $snapshot = replaySnapshot();
    unset($snapshot['frames'][0]['content']['Cards'][0]['Zone']);

    try {
        ValidateReplaySnapshot::run($snapshot);
    } catch (ValidationException $e) {
        expect($e->errors())->toHaveKey('frames.0.content.Cards.0.Zone');

        return;
    }

    $this->fail('Expected a ValidationException.');
});
