<?php

namespace Mymtgo\Replay\Actions;

use Illuminate\Validation\ValidationException;
use Mymtgo\Replay\ReplaySnapshot;

class ValidateReplaySnapshot
{
    /**
     * Check a match snapshot's structure in one pass. Frames are walked by
     * hand rather than with wildcard rules: a game holds hundreds of frames
     * that each carry every card, which wildcard expansion handles slowly.
     *
     * Card images must be remote https URLs, since a desktop-local image URL
     * points at the player's own machine and is dead for anyone else.
     *
     * @param  array<string, mixed>  $snapshot
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    public static function run(array $snapshot): array
    {
        $errors = [];

        $fail = function (string $path, string $message) use (&$errors): void {
            $errors[$path][] = $message;
        };

        if (($snapshot['version'] ?? null) !== ReplaySnapshot::VERSION) {
            $fail('version', 'Unsupported snapshot version.');
        }

        self::meta($snapshot['meta'] ?? null, $fail);
        self::games($snapshot['games'] ?? null, $fail);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $snapshot;
    }

    private static function meta(mixed $meta, callable $fail): void
    {
        if (! is_array($meta)) {
            $fail('meta', 'Required.');

            return;
        }

        if (! is_string($meta['played_at'] ?? null)) {
            $fail('meta.played_at', 'Must be a string.');
        }

        if (! is_int($meta['games_in_match'] ?? null) || $meta['games_in_match'] < 1) {
            $fail('meta.games_in_match', 'Must be a positive integer.');
        }

        foreach (['format', 'local_archetype', 'opponent_archetype'] as $key) {
            if (! array_key_exists($key, $meta) || ! (is_string($meta[$key]) || $meta[$key] === null)) {
                $fail("meta.{$key}", 'Must be a string or null.');
            }
        }
    }

    private static function games(mixed $games, callable $fail): void
    {
        if (! is_array($games) || ! array_is_list($games) || $games === []) {
            $fail('games', 'Must be a non-empty list.');

            return;
        }

        foreach ($games as $g => $game) {
            if (! is_array($game)) {
                $fail("games.{$g}", 'Must be an object.');

                continue;
            }

            if (! is_int($game['game_number'] ?? null) || $game['game_number'] < 1) {
                $fail("games.{$g}.game_number", 'Must be a positive integer.');
            }

            if (! array_key_exists('won', $game) || ! (is_bool($game['won']) || $game['won'] === null)) {
                $fail("games.{$g}.won", 'Must be true, false or null.');
            }

            self::frames($game['frames'] ?? null, "games.{$g}.frames", $fail);
            self::log($game['log'] ?? null, "games.{$g}.log", $fail);

            if (array_key_exists('sideboard', $game)) {
                self::sideboard($game['sideboard'], "games.{$g}.sideboard", $fail);
            }
        }
    }

    /** Your sideboard as the game began; optional, since older snapshots predate it. */
    private static function sideboard(mixed $sideboard, string $path, callable $fail): void
    {
        if (! is_array($sideboard) || ! array_is_list($sideboard)) {
            $fail($path, 'Must be a list.');

            return;
        }

        foreach ($sideboard as $s => $entry) {
            if (! is_int($entry['catalog_id'] ?? null)) {
                $fail("{$path}.{$s}.catalog_id", 'Must be an integer.');
            }

            if (! is_int($entry['quantity'] ?? null) || $entry['quantity'] < 1) {
                $fail("{$path}.{$s}.quantity", 'Must be a positive integer.');
            }

            foreach (['name', 'type'] as $key) {
                if (! array_key_exists($key, $entry) || ! (is_string($entry[$key]) || $entry[$key] === null)) {
                    $fail("{$path}.{$s}.{$key}", 'Must be a string or null.');
                }
            }

            $image = $entry['image'] ?? null;

            if ($image !== null && (! is_string($image) || ! str_starts_with($image, 'https://'))) {
                $fail("{$path}.{$s}.image", 'Must be a remote https URL or null.');
            }
        }
    }

    private static function frames(mixed $frames, string $path, callable $fail): void
    {
        if (! is_array($frames) || ! array_is_list($frames) || $frames === []) {
            $fail($path, 'Must be a non-empty list.');

            return;
        }

        foreach ($frames as $f => $frame) {
            if (! is_string($frame['timestamp'] ?? null)) {
                $fail("{$path}.{$f}.timestamp", 'Must be a string.');
            }

            $content = $frame['content'] ?? null;

            if (! is_array($content)) {
                $fail("{$path}.{$f}.content", 'Required.');

                continue;
            }

            self::players($content['Players'] ?? null, "{$path}.{$f}.content.Players", $fail);
            self::cards($content['Cards'] ?? null, "{$path}.{$f}.content.Cards", $fail);
        }
    }

    private static function players(mixed $players, string $path, callable $fail): void
    {
        if (! is_array($players) || ! array_is_list($players)) {
            $fail($path, 'Must be a list.');

            return;
        }

        foreach ($players as $p => $player) {
            if (! is_int($player['Id'] ?? null)) {
                $fail("{$path}.{$p}.Id", 'Must be an integer.');
            }

            if (! is_string($player['Name'] ?? null)) {
                $fail("{$path}.{$p}.Name", 'Must be a string.');
            }
        }
    }

    private static function cards(mixed $cards, string $path, callable $fail): void
    {
        if (! is_array($cards) || ! array_is_list($cards)) {
            $fail($path, 'Must be a list.');

            return;
        }

        foreach ($cards as $c => $card) {
            foreach (['Id', 'CatalogID', 'Owner'] as $key) {
                if (! is_int($card[$key] ?? null)) {
                    $fail("{$path}.{$c}.{$key}", 'Must be an integer.');
                }
            }

            if (! is_string($card['Zone'] ?? null)) {
                $fail("{$path}.{$c}.Zone", 'Must be a string.');
            }

            foreach (['image', 'other_image'] as $key) {
                $image = $card[$key] ?? null;

                if ($image !== null && (! is_string($image) || ! str_starts_with($image, 'https://'))) {
                    $fail("{$path}.{$c}.{$key}", 'Must be a remote https URL or null.');
                }
            }
        }
    }

    private static function log(mixed $log, string $path, callable $fail): void
    {
        if (! is_array($log) || ! array_is_list($log)) {
            $fail($path, 'Must be a list.');

            return;
        }

        foreach ($log as $l => $entry) {
            if (! is_string($entry['timestamp'] ?? null)) {
                $fail("{$path}.{$l}.timestamp", 'Must be a string.');
            }

            if (! is_string($entry['message'] ?? null)) {
                $fail("{$path}.{$l}.message", 'Must be a string.');
            }
        }
    }
}
