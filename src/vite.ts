import type { Plugin } from 'vite';
import { createVitePlugin } from 'unplugin';
import type { Options } from './types';
import { interopDefault } from './utils';
import { unpluginFactory } from '.';

export default async (options: Options) => {
  const plugins = [createVitePlugin(unpluginFactory)(options)] as Plugin[];
  if (options?.enable && options?.vconsole?.enabled) {
    try {
      const viteVConsilePlugin = await interopDefault(import('vite-plugin-vconsole'));
      plugins.push(viteVConsilePlugin(options?.vconsole) as Plugin);
    }
    catch (e) {
      console.error('vite-plugin-vconsole not found');
    }
  }
  return plugins;
};
