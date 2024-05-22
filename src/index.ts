import type { ChildProcess } from 'node:child_process';
import { exec } from 'node:child_process';
import process from 'node:process';
import type { UnpluginFactory, UnpluginOptions } from 'unplugin';
import { createUnplugin } from 'unplugin';
import type { ResolvedConfig } from 'vite';
import c from 'picocolors';
import { viteVConsole } from 'vite-plugin-vconsole';
import type { Options } from './types';

let config: ResolvedConfig;

let devtoolsInstance: ChildProcess | undefined;

const colorUrl = (url: string) => c.green(url.replace(/:(\d+)\//, (_, port) => `:${c.bold(port)}/`));

export const unpluginFactory: UnpluginFactory<Options | undefined, boolean> = (options) => {
  const unpluginDing: UnpluginOptions = {
    name: 'unplugin-dingtalk',
    enforce: 'pre',
    transformInclude(id) {
      return id.endsWith('main.ts') || id.endsWith('main.js');
    },
    transform(_source) {
      if (options?.enable && options?.vueDevtools?.enable) {
        const code = `/* eslint-disable */;
        import { devtools } from '@vue/devtools'
        devtools.connect(${options?.vueDevtools?.host}, ${options?.vueDevtools?.port})
        /* eslint-enable */${_source};
        `;

        return {
          code,
          map: null, // support source map
        };
      }

      return {
        code: _source,
        map: null, // support source map
      };
    },
    vite: {
      configResolved(_config) {
        config = _config;
      },
      configureServer(server) {
        if (!options?.enable) {
          return;
        }

        function debug(...args: Parameters<typeof console.log>) {
          if (options?.debug) {
            console.log(`  ${c.yellow('DEBUG')}  `, ...args);
          }
        }

        const _printUrls = server.printUrls.bind(server);
        let source = `localhost:${config.server.port || 5173}`;
        const url = server.resolvedUrls?.local[0];
        if (url) {
          const u = new URL(url);
          source = u.host;
        }
        const base = server.config.base || '/';
        const _targetUrl = options?.targetUrl ?? `http://${source}${base}`;

        server.printUrls = () => {
          _printUrls();
          console.log(`  ${c.green('➜')}  ${c.bold(
            `Open in dingtalk${
              options?.vueDevtools?.enable
                ? ' (with vue-devtools)'
                : ''
            }`,
          )}: ${colorUrl(`http://${source}${base}open-dingtalk`)}`);
        };

        const targetURL = new URL(_targetUrl);
        targetURL.searchParams.append('ddtab', 'true');
        if (options?.corpId) {
          targetURL.searchParams.append('corpId', options.corpId);
        }

        server.middlewares.use('/open-dingtalk', (req, res) => {
          debug(targetURL.toString());
          res.writeHead(302, {
            Location: `dingtalk://dingtalkclient/page/link?url=${encodeURIComponent(targetURL.toString())}`,
          });

          if (options?.vueDevtools?.enable && !devtoolsInstance) {
            devtoolsInstance = exec('npx vue-devtools');

            console.log(`  ${c.green('➜')}  vue-devtools is running. If the devtools has no data, please refresh the page in dingtalk.`);

            devtoolsInstance.on('exit', () => {
              devtoolsInstance = undefined;
            });

            process.on('exit', () => {
              if (devtoolsInstance) {
                devtoolsInstance.kill();
              }
            });
          }

          res.end();
        });
      },
    },
  };

  if (options?.enable && options?.vconsole?.enabled) {
    return [viteVConsole(options?.vconsole) as UnpluginOptions, unpluginDing];
  }
  else {
    return unpluginDing;
  }
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);
export default unplugin;
