// Resolves the parser from the dev harness's install, since the package has no node_modules of its own.
import { register } from 'node:module';

register('./resolve-mtgr.mjs', import.meta.url);
