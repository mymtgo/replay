const HARNESS_PACKAGES = new Set(['@mtgreplay/mtgr', 'vue']);
const HARNESS = new URL('../../dev/src/main.ts', import.meta.url).href;

/**
 * The viewer's modules import each other without extensions, as Vite allows,
 * and the parser and Vue by package name, which the dev harness installs.
 */
export async function resolve(specifier, context, next) {
    if (HARNESS_PACKAGES.has(specifier)) {
        return next(specifier, { ...context, parentURL: HARNESS });
    }

    if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
        return next(`${specifier}.ts`, context);
    }

    return next(specifier, context);
}
