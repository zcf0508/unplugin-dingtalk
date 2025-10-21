import type { Options } from 'tsdown';

export default {
  entry: [
    'src/*.ts',
  ],
  clean: true,
  format: ['cjs', 'esm'],
  dts: true,
} satisfies Options;
