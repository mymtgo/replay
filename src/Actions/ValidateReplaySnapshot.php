<?php

namespace Mymtgo\Replay\Actions;

use Illuminate\Validation\ValidationException;
use Mymtgo\Replay\ReplaySnapshot;

class ValidateReplaySnapshot
{
    /**
     * Check a snapshot's structure in one pass. Frames are walked by hand
     * rather than with wildcard rules: a game holds hundreds of frames that
     * each carry every card, which wildcard expansion handles slowly.
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

        if (! array_key_exists('won', $snapshot) || ! (is_bool($snapshot['won']) || $snapshot['won'] === null)) {
            $fail('won', 'Must be true, false or null.');
        }

        self::meta($snapshot['meta'] ?? null, $fail);
        self::frames($snapshot['frames'] ?? null, $fail);
        self::log($snapshot['log'] ?? null, $fail);

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

        foreach (['game_number', 'games_in_match'] as $key) {
            if (! is_int($meta[$key] ?? null) || $meta[$key] < 1) {
                $fail("meta.{$key}", 'Must be a positive integer.');
            }
        }

        foreach (['format', 'local_archetype', 'opponent_archetype'] as $key) {
            if (! array_key_exists($key, $meta) || ! (is_string($meta[$key]) || $meta[$key] === null)) {
                $fail("meta.{$key}", 'Must be a string or null.');
            }
        }
    }

    private static function frames(mixed $frames, callable $fail): void
    {
        if (! is_array($frames) || ! array_is_list($frames) || $frames === []) {
            $fail('frames', 'Must be a non-empty list.');

            return;
        }

        foreach ($frames as $f => $frame) {
            if (! is_string($frame['timestamp'] ?? null)) {
                $fail("frames.{$f}.timestamp", 'Must be a string.');
            }

            $content = $frame['content'] ?? null;

            if (! is_array($content)) {
                $fail("frames.{$f}.content", 'Required.');

                continue;
            }

            self::players($content['Players'] ?? null, "frames.{$f}.content.Players", $fail);
            self::cards($content['Cards'] ?? null, "frames.{$f}.content.Cards", $fail);
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

            $image = $card['image'] ?? null;

            if ($image !== null && (! is_string($image) || ! str_starts_with($image, 'https://'))) {
                $fail("{$path}.{$c}.image", 'Must be a remote https URL or null.');
            }
        }
    }

    private static function log(mixed $log, callable $fail): void
    {
        if (! is_array($log) || ! array_is_list($log)) {
            $fail('log', 'Must be a list.');

            return;
        }

        foreach ($log as $l => $entry) {
            if (! is_string($entry['timestamp'] ?? null)) {
                $fail("log.{$l}.timestamp", 'Must be a string.');
            }

            if (! is_string($entry['message'] ?? null)) {
                $fail("log.{$l}.message", 'Must be a string.');
            }
        }
    }
}
