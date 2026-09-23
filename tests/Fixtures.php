<?php

/**
 * A minimal valid two-player snapshot: local.player (Id 1) against Opp_Name (Id 2).
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function replaySnapshot(array $overrides = []): array
{
    return array_replace_recursive([
        'version' => 1,
        'won' => true,
        'meta' => [
            'format' => 'modern',
            'played_at' => '2026-09-20T18:00:00+00:00',
            'game_number' => 1,
            'games_in_match' => 3,
            'local_archetype' => 'Boros Energy',
            'opponent_archetype' => null,
        ],
        'frames' => [
            [
                'timestamp' => '2026-09-20T18:00:01+00:00',
                'content' => [
                    'Players' => [
                        ['Id' => 1, 'Name' => 'local.player', 'Life' => 20],
                        ['Id' => 2, 'Name' => 'Opp_Name', 'Life' => 20],
                    ],
                    'Cards' => [
                        ['Id' => 10, 'CatalogID' => 1234, 'Zone' => 'Battlefield', 'Owner' => 2, 'name' => 'Ragavan, Nimble Pilferer', 'type' => 'Legendary Creature', 'image' => 'https://cards.scryfall.io/normal/front/a/b/ab.jpg'],
                    ],
                ],
            ],
        ],
        'log' => [
            ['timestamp' => '2026-09-20T18:00:01+00:00', 'message' => 'Opp_Name casts Ragavan, Nimble Pilferer.'],
            ['timestamp' => '2026-09-20T18:00:02+00:00', 'message' => "local.player attacks Opp_Name's face."],
        ],
    ], $overrides);
}
