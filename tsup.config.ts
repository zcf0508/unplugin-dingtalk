import type { Options } from 'tsup';

export default <Options>{
  entryPoints: [
    'src/*.ts',
  ],
  clean: true,
  format: ['esm'],
  dts: true,
};
