<?php

use Mymtgo\Replay\Actions\RedactPlayer;
use Mymtgo\Replay\Exceptions\RedactionFailed;

it('renames the player in every frame', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['frames'][] = $snapshot['games'][0]['frames'][0];

    $redacted = RedactPlayer::run($snapshot, 'Opp_Name');

    foreach ($redacted['games'][0]['frames'] as $frame) {
        expect($frame['content']['Players'][1]['Name'])->toBe('Opponent')
            ->and($frame['content']['Players'][0]['Name'])->toBe('local.player');
    }
});

it('replaces whole-token mentions in the log, keeping punctuation', function () {
    $redacted = RedactPlayer::run(replaySnapshot(), 'Opp_Name');

    expect($redacted['games'][0]['log'][0]['message'])->toBe('Opponent casts Ragavan, Nimble Pilferer.')
        ->and($redacted['games'][0]['log'][1]['message'])->toBe("local.player attacks Opponent's face.");
});

it('replaces a name that ends a sentence or sits in punctuation', function (string $message, string $expected) {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['log'][0]['message'] = $message;

    expect(RedactPlayer::run($snapshot, 'Opp_Name')['games'][0]['log'][0]['message'])->toBe($expected);
})->with([
    'full stop' => ['local.player casts Thoughtseize targeting Opp_Name.', 'local.player casts Thoughtseize targeting Opponent.'],
    'ellipsis' => ['Waiting for Opp_Name...', 'Waiting for Opponent...'],
    'dash after' => ['Opp_Name - conceded', 'Opponent - conceded'],
    'parentheses' => ['(Opp_Name)', '(Opponent)'],
]);

it('replaces a dotted username without eating its dots', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['frames'][0]['content']['Players'][1]['Name'] = 'opp.name';
    $snapshot['games'][0]['log'][0]['message'] = 'Targeting opp.name.';

    $redacted = RedactPlayer::run($snapshot, 'opp.name');

    expect($redacted['games'][0]['log'][0]['message'])->toBe('Targeting Opponent.');
});

it('matches the username case-insensitively', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['log'][0]['message'] = 'opp_name casts a spell.';
    $snapshot['games'][0]['frames'][0]['content']['Players'][1]['Name'] = 'OPP_NAME';

    $redacted = RedactPlayer::run($snapshot, 'Opp_Name');

    expect($redacted['games'][0]['log'][0]['message'])->toBe('Opponent casts a spell.')
        ->and($redacted['games'][0]['frames'][0]['content']['Players'][1]['Name'])->toBe('Opponent');
});

it('leaves card fields alone when a card name contains the username', function () {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['frames'][0]['content']['Cards'][0]['name'] = "Opp_Name's Folly";

    $redacted = RedactPlayer::run($snapshot, 'Opp_Name');

    expect($redacted['games'][0]['frames'][0]['content']['Cards'][0]['name'])->toBe("Opp_Name's Folly");
});

it('refuses when the username survives glued to other text', function (string $message) {
    $snapshot = replaySnapshot();
    $snapshot['games'][0]['log'][0]['message'] = $message;

    RedactPlayer::run($snapshot, 'Opp_Name');
})->with([
    'xOpp_Name casts a spell.',
    'Opp_Name123 casts a spell.',
])->throws(RedactionFailed::class);

it('does not touch other snapshot keys', function () {
    $snapshot = replaySnapshot();

    $redacted = RedactPlayer::run($snapshot, 'Opp_Name');

    expect($redacted['meta'])->toBe($snapshot['meta'])
        ->and($redacted['games'][0]['won'])->toBe($snapshot['games'][0]['won'])
        ->and($redacted['version'])->toBe($snapshot['version']);
});

it('redacts every game of the match', function () {
    $snapshot = replaySnapshot();
    $second = $snapshot['games'][0];
    $second['game_number'] = 2;
    $snapshot['games'][] = $second;

    $redacted = RedactPlayer::run($snapshot, 'Opp_Name');

    expect($redacted['games'][1]['frames'][0]['content']['Players'][1]['Name'])->toBe('Opponent')
        ->and($redacted['games'][1]['log'][0]['message'])->toBe('Opponent casts Ragavan, Nimble Pilferer.');
});

it('rejects an empty username', function () {
    RedactPlayer::run(replaySnapshot(), '  ');
})->throws(InvalidArgumentException::class);
