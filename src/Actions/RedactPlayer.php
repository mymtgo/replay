<?php

namespace Mymtgo\Replay\Actions;

use InvalidArgumentException;
use Mymtgo\Replay\Exceptions\RedactionFailed;
use Mymtgo\Replay\ReplaySnapshot;

class RedactPlayer
{
    /** Characters that can be part of an MTGO username, so a match next to one is not a whole token. */
    private const NAME_CHARACTERS = 'A-Za-z0-9_.\-';

    /**
     * Replace a player's name with "Opponent" in every frame and every log
     * line, then prove it is gone. Card name, type and image are left alone
     * and are not checked: a username can legitimately be part of a card name.
     *
     * @param  array<string, mixed>  $snapshot
     * @return array<string, mixed>
     *
     * @throws RedactionFailed when the name survives in a player name or log line
     */
    public static function run(array $snapshot, string $username): array
    {
        $username = trim($username);

        if ($username === '') {
            throw new InvalidArgumentException('A username is required.');
        }

        $pattern = '/(?<!['.self::NAME_CHARACTERS.'])'.preg_quote($username, '/').'(?!['.self::NAME_CHARACTERS.'])/i';

        foreach ($snapshot['frames'] as $f => $frame) {
            foreach ($frame['content']['Players'] as $p => $player) {
                if (strcasecmp($player['Name'], $username) === 0) {
                    $snapshot['frames'][$f]['content']['Players'][$p]['Name'] = ReplaySnapshot::REDACTED_NAME;
                }
            }
        }

        foreach ($snapshot['log'] as $l => $entry) {
            $snapshot['log'][$l]['message'] = preg_replace($pattern, ReplaySnapshot::REDACTED_NAME, $entry['message']);
        }

        self::assertGone($snapshot, $username);

        return $snapshot;
    }

    /** @param  array<string, mixed>  $snapshot */
    private static function assertGone(array $snapshot, string $username): void
    {
        foreach ($snapshot['frames'] as $frame) {
            foreach ($frame['content']['Players'] as $player) {
                if (stripos($player['Name'], $username) !== false) {
                    throw new RedactionFailed('A player name still contains the redacted username.');
                }
            }
        }

        foreach ($snapshot['log'] as $entry) {
            if (stripos($entry['message'], $username) !== false) {
                throw new RedactionFailed('A log line still contains the redacted username.');
            }
        }
    }
}
