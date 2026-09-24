<?php

namespace Mymtgo\Replay\Actions;

class PrepareSharedSnapshot
{
    /**
     * A snapshot ready to leave the sharer's hands: every opponent name
     * replaced with "Opponent" and the whole structure validated. The
     * desktop share and the site's own replay creation both go through
     * here, so the two can never disagree about what gets redacted.
     *
     * @param  array<string, mixed>  $snapshot
     * @param  list<string>  $opponentNames
     * @return array<string, mixed>
     *
     * @throws \Mymtgo\Replay\Exceptions\RedactionFailed when a name survives
     * @throws \Illuminate\Validation\ValidationException when the snapshot is malformed
     */
    public static function run(array $snapshot, array $opponentNames): array
    {
        foreach ($opponentNames as $name) {
            if (trim($name) === '') {
                continue;
            }

            $snapshot = RedactPlayer::run($snapshot, $name);
        }

        return ValidateReplaySnapshot::run($snapshot);
    }
}
