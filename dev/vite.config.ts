import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const examples = '/Volumes/Dev/mtgreplay/typescript-parser/standards/examples';

/** The viewer lives outside this folder, so its bare imports are pointed at the dependencies installed here. */
const HOST_DEPENDENCIES = ['vue', '@vueuse/core', 'lucide-vue-next', 'clsx', 'tailwind-merge', '@mtgreplay/mtgr'];
const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** Serves the package's viewer the way a host does: through an alias, with the host providing every dependency. */
export default defineConfig({
    plugins: [vue(), tailwindcss()],
    publicDir: examples,
    resolve: {
        alias: {
            '@replay': local('../resources/js'),
            ...Object.fromEntries(HOST_DEPENDENCIES.map((name) => [name, local(`./node_modules/${name}`)])),
        },
    },
    server: {
        port: 5180,
        fs: { allow: [fileURLToPath(new URL('..', import.meta.url)), '/Volumes/Dev/mtgreplay/typescript-parser'] },
    },
});
