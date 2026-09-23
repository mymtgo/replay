<?php

use Mymtgo\Replay\Actions\RedactPlayer;
use Mymtgo\Replay\Exceptions\RedactionFailed;

it('renames the player in every frame', function () {
    $snapshot = replaySnapshot();
    $snapshot['frames'][] = $snapshot['frames'][0];

    $redacted = RedactPlayer::run($snapshot, 'Opp_Name');

    foreach ($redacted['frames'] as $frame) {
        expect($frame['content']['Players'][1]['Name'])->toBe('Opponent')
            ->and($frame['content']['Players'][0]['Name'])->toBe('local.player');
    }
});

it('replaces whole-token mentions in the log, keeping punctuation', function () {
    $redacted = RedactPlayer::run(replaySnapshot(), 'Opp_Name');

    expect($redacted['log'][0]['message'])->toBe('Opponent casts Ragavan, Nimble Pilferer.')
        ->and($redacted['log'][1]['message'])->toBe("local.player attacks Opponent's face.");
});

it('matches the username case-insensitively', function () {
    $snapshot = replaySnapshot();
    $snapshot['log'][0]['message'] = 'opp_name casts a spell.';
    $snapshot['frames'][0]['content']['Players'][1]['Name'] = 'OPP_NAME';

    $redacted = RedactPlayer::run($snapshot, 'Opp_Name');

    expect($redacted['log'][0]['message'])->toBe('Opponent casts a spell.')
        ->and($redacted['frames'][0]['content']['Players'][1]['Name'])->toBe('Opponent');
});

it('leaves card fields alone when a card name contains the username', function () {
    $snapshot = replaySnapshot();
    $snapshot['frames'][0]['content']['Cards'][0]['name'] = "Opp_Name's Folly";

    $redacted = RedactPlayer::run($snapshot, 'Opp_Name');

    expect($redacted['frames'][0]['content']['Cards'][0]['name'])->toBe("Opp_Name's Folly");
});

it('refuses when the username survives glued to other text', function (string $message) {
    $snapshot = replaySnapshot();
    $snapshot['log'][0]['message'] = $message;

    RedactPlayer::run($snapshot, 'Opp_Name');
})->with([
    'xOpp_Name casts a spell.',
    'Opp_Name123 casts a spell.',
])->throws(RedactionFailed::class);

it('does not touch other snapshot keys', function () {
    $snapshot = replaySnapshot();

    $redacted = RedactPlayer::run($snapshot, 'Opp_Name');

    expect($redacted['meta'])->toBe($snapshot['meta'])
        ->and($redacted['won'])->toBe($snapshot['won'])
        ->and($redacted['version'])->toBe($snapshot['version']);
});

it('rejects an empty username', function () {
    RedactPlayer::run(replaySnapshot(), '  ');
})->throws(InvalidArgumentException::class);
