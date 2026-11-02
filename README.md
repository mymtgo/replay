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

`card-image` returns the image URL for a card name (and for a face of a double-faced card), or null when the host has none.

## Development harness

`dev/` is a Vite app that mounts the viewer the way a host does. It loads the example files from the parser's `standards/examples` folder, shows `validate()` problems, and lets you pick a game.

```sh
cd dev
npm install
npm run dev
```

## Tests

```sh
node --test tests/js/
```
