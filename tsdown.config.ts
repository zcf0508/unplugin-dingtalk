import type { Options } from 'tsdown';

export default <Options>{
  entry: [
    'src/*.ts',
  ],
  clean: true,
  format: ['cjs', 'esm'],
  dts: true,
};
