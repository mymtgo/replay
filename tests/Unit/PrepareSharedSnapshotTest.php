<?php

use Illuminate\Validation\ValidationException;
use Mymtgo\Replay\Actions\PrepareSharedSnapshot;

it('redacts every opponent in frames and log', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['frames'][0]['content']['Players'][] = ['Id' => 3, 'Name' => 'Second_Opp'];
    $snapshot['games'][0]['log'][] = ['timestamp' => '2026-09-20T18:00:03+00:00', 'message' => 'Second_Opp joined.'];

    $prepared = PrepareSharedSnapshot::run($snapshot, ['Opp_Name', 'Second_Opp']);
    $encoded = json_encode($prepared);

    expect($encoded)->not->toContain('Opp_Name')
        ->and($encoded)->not->toContain('Second_Opp')
        ->and($prepared['games'][0]['frames'][0]['content']['Players'][0]['Name'])->toBe('local.player');
});

it('ignores blank opponent names', function () {
    $prepared = PrepareSharedSnapshot::run(replaySnapshot(), ['', '  ', 'Opp_Name']);

    expect(json_encode($prepared))->not->toContain('Opp_Name');
});

it('rejects a snapshot the site would refuse', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['frames'][0]['content']['Cards'][0]['image'] = 'http://127.0.0.1/x.jpg';

    PrepareSharedSnapshot::run($snapshot, ['Opp_Name']);
})->throws(ValidationException::class);
