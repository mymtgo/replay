const PARSER = '@mtgreplay/mtgr';
const HARNESS = new URL('../../dev/src/main.ts', import.meta.url).href;

/**
 * The viewer's modules import each other without extensions, as Vite allows,
 * and the parser by its package name, which the dev harness installs.
 */
export async function resolve(specifier, context, next) {
    if (specifier === PARSER) {
        return next(specifier, { ...context, parentURL: HARNESS });
    }

    if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
        return next(`${specifier}.ts`, context);
    }

    return next(specifier, context);
}
