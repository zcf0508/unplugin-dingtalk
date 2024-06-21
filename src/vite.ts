import type { Plugin } from 'vite';
import { createVitePlugin } from 'unplugin';
import viteVConsole from 'vite-plugin-vconsole';
import type { Options } from './types';
import { unpluginFactory } from '.';

export default (options: Options) => {
  const plugins = [createVitePlugin(unpluginFactory)(options)] as Plugin[];
  if (options?.enable && options?.vconsole?.enabled) {
    plugins.push(viteVConsole(options?.vconsole) as Plugin);
  }
  return plugins;
};
