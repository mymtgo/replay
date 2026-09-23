<?php

namespace Mymtgo\Replay\Actions;

use InvalidArgumentException;
use Mymtgo\Replay\Exceptions\RedactionFailed;
use Mymtgo\Replay\ReplaySnapshot;

class RedactPlayer
{
    /** Characters that can start or end an MTGO username. */
    private const WORD_CHARACTERS = 'A-Za-z0-9_';

    /** Characters a username may contain between word characters, never at its edge. */
    private const JOINERS = '.\-';

    /**
     * Replace a player's name with "Opponent" in every frame and every log
     * line of every game, then prove it is gone. Card name, type and image are left alone
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

        // A match is a whole token unless a word character touches it, directly
        // or through a joiner. A full stop or dash with nothing after it is
        // punctuation ("targeting Opp_Name."), not more of the name.
        $word = '['.self::WORD_CHARACTERS.']';
        $joiner = '['.self::JOINERS.']';
        $pattern = "/(?<!{$word})(?<!{$word}{$joiner})".preg_quote($username, '/')."(?!{$word})(?!{$joiner}{$word})/i";

        foreach ($snapshot['games'] as $g => $game) {
            foreach ($game['frames'] as $f => $frame) {
                foreach ($frame['content']['Players'] as $p => $player) {
                    if (strcasecmp($player['Name'], $username) === 0) {
                        $snapshot['games'][$g]['frames'][$f]['content']['Players'][$p]['Name'] = ReplaySnapshot::REDACTED_NAME;
                    }
                }
            }

            foreach ($game['log'] as $l => $entry) {
                $snapshot['games'][$g]['log'][$l]['message'] = preg_replace($pattern, ReplaySnapshot::REDACTED_NAME, $entry['message']);
            }
        }

        self::assertGone($snapshot, $username);

        return $snapshot;
    }

    /** @param  array<string, mixed>  $snapshot */
    private static function assertGone(array $snapshot, string $username): void
    {
        foreach ($snapshot['games'] as $game) {
            foreach ($game['frames'] as $frame) {
                foreach ($frame['content']['Players'] as $player) {
                    if (stripos($player['Name'], $username) !== false) {
                        throw new RedactionFailed('A player name still contains the redacted username.');
                    }
                }
            }

            foreach ($game['log'] as $entry) {
                if (stripos($entry['message'], $username) !== false) {
                    throw new RedactionFailed('A log line still contains the redacted username.');
                }
            }
        }
    }
}
