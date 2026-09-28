<?php

use Mymtgo\Replay\Actions\BuildReplaySnapshot;
use Mymtgo\Replay\Actions\RepairMidnightWrap;

/**
 * @param  list<string>  $timestamps
 * @return list<array{timestamp: string, content: array<string, mixed>}>
 */
function wrapFrames(array $timestamps): array
{
    return array_map(fn (string $timestamp) => ['timestamp' => $timestamp, 'content' => ['Tag' => $timestamp]], $timestamps);
}

it('moves frames dated before the real start to the end, a day later', function () {
    $frames = wrapFrames(['2026-09-26T00:00:10Z', '2026-09-26T00:00:39Z', '2026-09-26T23:48:07Z', '2026-09-26T23:59:57Z']);

    expect(array_column(RepairMidnightWrap::run($frames), 'timestamp'))->toBe([
        '2026-09-26T23:48:07Z',
        '2026-09-26T23:59:57Z',
        '2026-09-27T00:00:10Z',
        '2026-09-27T00:00:39Z',
    ])->and(RepairMidnightWrap::run($frames)[2]['content'])->toBe(['Tag' => '2026-09-26T00:00:10Z']);
});

it('rolls the date over a month end', function () {
    $frames = wrapFrames(['2026-09-30T00:00:05Z', '2026-09-30T23:58:00Z']);

    expect(array_column(RepairMidnightWrap::run($frames), 'timestamp'))->toBe(['2026-09-30T23:58:00Z', '2026-10-01T00:00:05Z']);
});

it('leaves a correctly dated game past midnight alone', function () {
    $frames = wrapFrames(['2026-09-26T23:48:07Z', '2026-09-26T23:59:57Z', '2026-09-27T00:00:10Z']);

    expect(RepairMidnightWrap::run($frames))->toBe($frames);
});

it('leaves time-of-day frames from a desktop share alone', function () {
    $frames = wrapFrames(['00:00:10', '23:48:07']);

    expect(RepairMidnightWrap::run($frames))->toBe($frames)
        ->and(RepairMidnightWrap::run([]))->toBe([]);
});

it('builds snapshots from wrapped bundles in play order', function () {
    $timeline = [
        buildTimelineRow(1234, '2026-09-26T00:00:10Z'),
        buildTimelineRow(1234, '2026-09-26T23:48:07Z'),
    ];

    $snapshot = BuildReplaySnapshot::run(buildMatchInput([buildGameInput($timeline)]), buildCardResolver());

    expect(array_column($snapshot['games'][0]['frames'], 'timestamp'))->toBe(['2026-09-26T23:48:07Z', '2026-09-27T00:00:10Z']);
});
