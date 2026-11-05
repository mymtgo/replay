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
