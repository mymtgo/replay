# mymtgo/replay

The replay viewer: Vue components under `resources/js/` that play back a Magic: The Gathering game from a `.mtgr` file. The website and the MyMTGO desktop app mount `ReplayViewer`.

## Using the viewer in a host

The package has no JavaScript manifest. A host imports `resources/js/*` through an alias and provides the dependencies itself:

- `vue`, `@vueuse/core`, `lucide-vue-next`, `clsx`, `tailwind-merge`, Tailwind v4 (with `resources/css/replay.css` imported and `resources/js` in its sources)
- `@mtgreplay/mtgr`, the `.mtgr` parser: `npm install github:mtgreplay/typescript-parser`

The host parses the file and hands the viewer a game:

```ts
import { parse, validate } from '@mtgreplay/mtgr';

const problems = validate(text); // show these; the viewer still renders what parsed
const { games } = parse(text).file;
```

```vue
<ReplayViewer :games="games" :game-index="0" :card-image="(name, face) => urlFor(name, face)" @select-game="index = $event" />
```

`card-image` returns the image URL for a card name (and for a face of a double-faced card), or null when the host has none. When the file gives the card's source ids (`mtgo:19683`, `arena:75000`) and the card shows its own front face, they come as a third argument, so the host can show the printing that was played. mymtgo.com answers `GET /api/card-images/{mtgo|arena}/{id}` with a redirect to the card's image, for use as the URL directly.

A card whose name the file records as `?` (spec decision 0048: the writer knew the card but not its name) comes with `name` null and only its source ids, so the host can still find its image. Without one it shows the card back, labelled "Unknown card" and its source id (`Unknown card #106504`); the same label names it in the log, the stack, the zone windows and the preview.

## Records from MTG Arena

The MyMTGO desktop app writes Arena games as `.mtgr` on read and plays them in this viewer. Arena does not report everything, and the file says so with `[Omits "costs"]` and `[Partial "library effects"]`. What the viewer shows for those gaps:

- An effect or ability with `?` text (the parser's `text: null`) shows "No text recorded" in the effects list, and "lasting effect" or its kind in the log.
- `incomplete` (a summarized Arena game state, or another hole in the source) shows the "recording is incomplete" banner until the next keyframe.
- An opponent's card that is never revealed stays a face-down card with no name (the log says the player "has a face-down card").
- `new card` and `identify` carry `src arena:<grpId>`, which reaches `card-image` as its third argument.
- A card the desktop app's card data does not list yet (a new set Scryfall has no Arena ids for) is written `?` with its `src arena:<grpId>` and shows as an unknown card. The record is built on read, so it gets its name once the card data has it.

The desktop app vendors `resources/js/` (without `snapshot/`), `resources/css/replay.css` and `resources/images/card-back.jpg` at a pinned commit of this branch and never patches the copy, except for peer version fixes. Viewer fixes the app needs land here first and are then re-vendored.

## Snapshot replays

Replays recorded before `.mtgr` are snapshot-v2 JSON: frames of board state per game, built by `BuildReplaySnapshot` and shared by mymtgo.com. They keep playing in `SnapshotReplayViewer`, the viewer as it was before `.mtgr`, kept unchanged under `resources/js/snapshot/`. A host picks the viewer by what it has stored: a `.mtgr` file goes to `ReplayViewer`, a snapshot game to `SnapshotReplayViewer`.

```vue
<SnapshotReplayViewer :frames="game.frames" :log="game.log" :won="game.won" :game-id="id" :match-games="games" />
```

Snapshot frames have no events, causes or targets, so they are not converted to `.mtgr`. New features go into `ReplayViewer` only; the snapshot viewer is retired once nothing serves snapshots.

## Development harness

`dev/` is a Vite app that mounts the viewer the way a host does. It loads the example files from the parser's `standards/examples` folder, shows `validate()` problems, and lets you pick a game. A `.json` file opens in the snapshot viewer; `snapshot-sample.json` is a small synthetic one.

```sh
cd dev
npm install
npm run dev
```

## Tests

The tests run on real `.mtgr` files under `tests/js/fixtures/` and resolve the parser through the harness's install, so run `npm install` in `dev/` first.

```sh
node --test --import ./tests/js/setup.mjs 'tests/js/*.test.ts' 'tests/js/snapshot/*.test.ts'
```
