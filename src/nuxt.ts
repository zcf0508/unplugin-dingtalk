import { addVitePlugin, addWebpackPlugin, defineNuxtModule } from '@nuxt/kit';
import vite from './vite';
import webpack from './webpack';
import type { Options } from './types';
import '@nuxt/schema';

export interface ModuleOptions extends Options {

}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-unplugin-dingtalk',
    configKey: 'unpluginStarter',
  },
  defaults: {
    // ...default options
  },
  async setup(options, _nuxt) {
    const vitePlugins = await vite(options);
    addVitePlugin(vitePlugins);
    // addWebpackPlugin(() => webpack(options));

    // ...
  },
});
