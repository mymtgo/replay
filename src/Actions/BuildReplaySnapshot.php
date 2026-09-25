<?php

namespace Mymtgo\Replay\Actions;

use Mymtgo\Replay\ReplaySnapshot;

class BuildReplaySnapshot
{
    /**
     * One match as a self-contained replay: every game that has frames, each
     * with remote card images, its game log and its result, plus the head
     * metadata the website shows. Unredacted; PrepareSharedSnapshot removes
     * the opponent's name.
     *
     * Plain arrays in, so the desktop app (from its own tables) and the site
     * (from a synced match bundle) build byte-identical snapshots from one
     * implementation.
     *
     * Game numbers are positions among all of the match's games, the same
     * numbering the desktop picker uses, so a game with no recorded frames
     * leaves a gap rather than renumbering the rest.
     *
     * A game's `sideboard` is your sideboard as it began, one entry per card
     * with its quantity; given, it travels resolved like frame cards, so the
     * viewer can show what you sided in and out whatever recorded the frames.
     * Only yours: the opponent's is never known, and your main deck stays
     * home. Left out when empty, since an empty list means it went unrecorded.
     *
     * @param  array{format: ?string, played_at: string, local_archetype: ?string, opponent_archetype: ?string, games: list<array{won: ?bool, local_username: ?string, timeline: list<array{timestamp: string, content: array<string, mixed>}>, log: list<array{timestamp: string, message: string}>, sideboard?: list<array{mtgo_id: int, quantity: int}>|null}>}  $match
     * @param  callable(list<int>): array<int, array{name: ?string, type: ?string, image: ?string, other_image?: ?string}>  $cards
     * @return array<string, mixed>
     */
    public static function run(array $match, callable $cards): array
    {
        $snapshots = [];

        foreach ($match['games'] as $index => $game) {
            if ($game['timeline'] === []) {
                continue;
            }

            $sideboard = $game['sideboard'] ?? [];
            $resolved = self::resolve($game['timeline'], $sideboard, $cards);

            $snapshot = [
                'game_number' => $index + 1,
                'won' => $game['won'],
                'frames' => self::frames($game['timeline'], $game['local_username'], $resolved),
                'log' => $game['log'],
            ];

            if ($sideboard !== []) {
                $snapshot['sideboard'] = self::sideboard($sideboard, $resolved);
            }

            $snapshots[] = $snapshot;
        }

        $format = self::formatKey($match['format']);

        return [
            'version' => ReplaySnapshot::VERSION,
            'meta' => [
                'format' => $format === '' ? null : $format,
                'played_at' => $match['played_at'],
                'games_in_match' => max(1, count($match['games'])),
                'local_archetype' => $match['local_archetype'],
                'opponent_archetype' => $match['opponent_archetype'],
            ],
            'games' => $snapshots,
        ];
    }

    /**
     * The archetypes.format key for an MTGO format: CMODERN, CModern and
     * Modern all give "modern". Only a C followed by another capital is a
     * prefix, so "Commander" stays a name. This mirrors the desktop app's
     * MtgoFormat::key so both builders agree.
     */
    public static function formatKey(?string $format): string
    {
        if ($format === null || $format === '') {
            return '';
        }

        $raw = preg_match('/^C[A-Z]/', $format) ? substr($format, 1) : $format;

        return strtolower($raw);
    }

    /**
     * Name, type and image for every card a game mentions, frames and
     * sideboard alike, in one call to the host's resolver.
     *
     * @param  list<array{timestamp: string, content: array<string, mixed>}>  $timeline
     * @param  list<array{mtgo_id: int, quantity: int}>  $sideboard
     * @return array<int, array{name: ?string, type: ?string, image: ?string, other_image?: ?string}>
     */
    private static function resolve(array $timeline, array $sideboard, callable $cards): array
    {
        $catalogIds = [];

        foreach ($timeline as $event) {
            foreach ($event['content']['Cards'] ?? [] as $card) {
                $catalogIds[$card['CatalogID']] = true;
            }
        }

        foreach ($sideboard as $entry) {
            $catalogIds[(int) $entry['mtgo_id']] = true;
        }

        return $catalogIds === [] ? [] : $cards(array_keys($catalogIds));
    }

    /**
     * A game's timeline as the viewer consumes it: every card carries its
     * name, type and image, and every player whether they are the local one.
     * Only https images survive, since anything else points at the sharer's
     * own machine.
     *
     * @param  list<array{timestamp: string, content: array<string, mixed>}>  $timeline
     * @param  array<int, array{name: ?string, type: ?string, image: ?string, other_image?: ?string}>  $resolved
     * @return list<array{timestamp: string, content: array<string, mixed>}>
     */
    private static function frames(array $timeline, ?string $localUsername, array $resolved): array
    {
        $frames = [];

        foreach ($timeline as $event) {
            $content = $event['content'];

            foreach ($content['Players'] ?? [] as $i => $player) {
                $content['Players'][$i]['IsLocal'] = $localUsername === $player['Name'];
            }

            foreach ($content['Cards'] ?? [] as $i => $card) {
                $known = $resolved[$card['CatalogID']] ?? null;
                $image = $known['image'] ?? null;

                $content['Cards'][$i]['image'] = is_string($image) && str_starts_with($image, 'https://') ? $image : null;
                $content['Cards'][$i]['type'] = $known['type'] ?? null;
                $content['Cards'][$i]['name'] = $known['name'] ?? self::mtgoName($card);
                unset($content['Cards'][$i]['Name']);

                // The other side of a double-faced card, for the preview. Set
                // only when known, so single-faced cards cost the snapshot
                // nothing.
                $otherImage = $known['other_image'] ?? null;

                if (is_string($otherImage) && str_starts_with($otherImage, 'https://')) {
                    $content['Cards'][$i]['other_image'] = $otherImage;
                }
            }

            $frames[] = ['timestamp' => (string) $event['timestamp'], 'content' => $content];
        }

        return $frames;
    }

    /**
     * The name MTGO itself gave a card, for ids the host's catalog cannot
     * resolve (most tokens have no Scryfall mtgo_id). Only for a card whose
     * identity is known: a hidden card has catalog id 0 and must stay nameless.
     *
     * @param  array<string, mixed>  $card
     */
    private static function mtgoName(array $card): ?string
    {
        $name = $card['Name'] ?? null;

        return (int) ($card['CatalogID'] ?? 0) > 0 && is_string($name) && $name !== '' ? $name : null;
    }

    /**
     * Your sideboard with each card's name, type and image, https images only.
     *
     * @param  list<array{mtgo_id: int, quantity: int}>  $sideboard
     * @param  array<int, array{name: ?string, type: ?string, image: ?string, other_image?: ?string}>  $resolved
     * @return list<array{catalog_id: int, quantity: int, name: ?string, type: ?string, image: ?string}>
     */
    private static function sideboard(array $sideboard, array $resolved): array
    {

        return array_map(function (array $entry) use ($resolved) {
            $known = $resolved[(int) $entry['mtgo_id']] ?? null;
            $image = $known['image'] ?? null;

            return [
                'catalog_id' => (int) $entry['mtgo_id'],
                'quantity' => (int) $entry['quantity'],
                'name' => $known['name'] ?? null,
                'type' => $known['type'] ?? null,
                'image' => is_string($image) && str_starts_with($image, 'https://') ? $image : null,
            ];
        }, $sideboard);
    }
}
