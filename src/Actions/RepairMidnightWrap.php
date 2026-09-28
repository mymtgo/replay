<?php

namespace Mymtgo\Replay\Actions;

use DateTimeImmutable;

class RepairMidnightWrap
{
    /** No real game waits this long between two frames; a gap this wide is a midnight wrap. */
    private const WRAP_GAP_SECONDS = 12 * 60 * 60;

    /**
     * A game's frames back in play order when a desktop client dated them
     * wrongly past midnight.
     *
     * Older clients stored sidecar frames as a time of day and dated every
     * one of them the same day when building the sync bundle, then sorted.
     * A game that crossed local midnight therefore opens with its final
     * frames (just after midnight) and jumps more than twelve hours forward
     * to its real start. Those leading frames move to the end, a day later.
     *
     * Only ISO 8601 timestamps can wrap this way. Frames timed `H:i:s` (a
     * desktop share) come in play order already and are returned as they
     * came, as is any game without such a gap.
     *
     * Spec docs/specs/2026-09-28-replay-midnight-frame-order.md (api repo).
     *
     * @template TFrame of array{timestamp: string}
     *
     * @param  list<TFrame>  $frames
     * @return list<TFrame>
     */
    public static function run(array $frames): array
    {
        $wrapAt = self::wrapIndex($frames);

        if ($wrapAt === null) {
            return $frames;
        }

        $afterMidnight = array_map(
            fn (array $frame) => ['timestamp' => self::nextDay($frame['timestamp'])] + $frame,
            array_slice($frames, 0, $wrapAt),
        );

        return [...array_slice($frames, $wrapAt), ...$afterMidnight];
    }

    /**
     * The first frame after the wrapping gap, or null when the frames do not wrap.
     *
     * @param  list<array{timestamp: string}>  $frames
     */
    private static function wrapIndex(array $frames): ?int
    {
        $previous = null;

        foreach ($frames as $index => $frame) {
            $time = self::isoSeconds($frame['timestamp']);

            if ($time === null) {
                return null;
            }

            if ($previous !== null && $time - $previous > self::WRAP_GAP_SECONDS) {
                return $index;
            }

            $previous = $time;
        }

        return null;
    }

    /** Unix seconds for an ISO 8601 timestamp; null for a bare time of day. */
    private static function isoSeconds(string $timestamp): ?int
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2}T/', $timestamp)) {
            return null;
        }

        $parsed = strtotime($timestamp);

        return $parsed === false ? null : $parsed;
    }

    /** The same timestamp a calendar day later, its time and zone untouched. */
    private static function nextDay(string $timestamp): string
    {
        $date = (new DateTimeImmutable(substr($timestamp, 0, 10)))->modify('+1 day')->format('Y-m-d');

        return $date.substr($timestamp, 10);
    }
}
