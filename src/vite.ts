import type { Plugin } from 'vite';
import type { Options } from './types';
import { createVitePlugin } from 'unplugin';
import { unpluginFactory } from '.';
import { interopDefault } from './utils';

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
