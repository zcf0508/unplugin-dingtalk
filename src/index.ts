import type { ChildProcess } from 'node:child_process';
import { exec } from 'node:child_process';
import process from 'node:process';
import fetch from 'node-fetch';
import type { UnpluginFactory, UnpluginOptions } from 'unplugin';
import { createUnplugin } from 'unplugin';
import type { ResolvedConfig } from 'vite';
import c from 'picocolors';
import { viteVConsole } from 'vite-plugin-vconsole';
import cookie from 'cookie';
// @ts-expect-error missing types
import { start } from 'chii';
import { getRandomPort } from 'get-port-please';
import type { Options, SetupMiddlewares } from './types';

let config: ResolvedConfig;

const colorUrl = (url: string) => c.green(url.replace(/:(\d+)\//, (_, port) => `:${c.bold(port)}/`));

export const resovedInfo = {
  devtoolsInstance: undefined as ChildProcess | undefined,
  availablePort: undefined as number | undefined,
  targetURL: undefined as undefined | URL,
};

export const unpluginFactory: UnpluginFactory<Options | undefined, boolean> = (options) => {
  const {
    chii: enableChii = true,
  } = options || {};

  function debug(...args: Parameters<typeof console.log>) {
    if (options?.debug) {
      console.log(`  ${c.yellow('DEBUG')}  `, ...args);
    }
  }

  const plugins = [] as UnpluginOptions[];

  const unpluginDing: UnpluginOptions = {
    name: 'unplugin-dingtalk',
    enforce: 'pre',
    transformInclude(id) {
      return (id.endsWith('main.ts') || id.endsWith('main.js')) && !id.includes('node_modules');
    },
    async transform(_source) {
      if (options?.enable && enableChii && !resovedInfo.availablePort) {
        resovedInfo.availablePort = await getRandomPort();
        debug(`chii server port: ${JSON.stringify({ availablePort: resovedInfo.availablePort })}`);
        start({
          port: resovedInfo.availablePort,
        });
      }

      if (options?.enable && options?.vueDevtools?.enable) {
        const codes = [
          `/* eslint-disable */;
          import { devtools } from '@vue/devtools'
          devtools.connect(${options?.vueDevtools?.host}, ${options?.vueDevtools?.port});`,
          options?.enable && enableChii
            ? `(() => { 
          const script = document.createElement('script'); 
          script.src="http://localhost:${resovedInfo.availablePort}/target.js"; 
          document.body.appendChild(script); 
          })()`
            : '',
          `/* eslint-enable */${_source};`,
        ];

        return {
          code: codes.join('\n'),
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
      async configureServer(server) {
        if (!options?.enable) {
          return;
        }

        const availablePort = resovedInfo.availablePort;

        if (options?.enable && options?.vconsole?.enabled) {
          plugins.push(viteVConsole(options?.vconsole) as UnpluginOptions);
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
          if (enableChii) {
            console.log(`  ${c.green('➜')}  ${c.bold(
              'Click to open chrome devtools',
            )}: ${colorUrl(`http://${source}${base}__chrome_devtools`)}`);
          }
        };

        const targetURL = new URL(_targetUrl);
        targetURL.searchParams.append('ddtab', 'true');
        if (options?.corpId) {
          targetURL.searchParams.append('corpId', options.corpId);
        }

        if (options.debugCookies && options.debugCookies.length > 0) {
          server.middlewares.use((req, res, next) => {
            // 获取 cookies
            const cookies = cookie.parse(req.headers.cookie || '');

            // 遍历 cookies 对象，并将每个 cookie 添加到 res 的 setCookie 中
            for (const [name, value] of Object.entries(cookies)) {
              if (options.debugCookies && options.debugCookies.length > 0 && options.debugCookies.includes(name)) {
                const serializedCookie = cookie.serialize(name, value, {
                  httpOnly: false,
                });
                res.setHeader('Set-Cookie', serializedCookie);
              }
            }

            next();
          });
        }

        if (enableChii) {
          server.middlewares.use('/__chrome_devtools', async (_req, res) => {
            try {
              const raw = await fetch(`http://localhost:${availablePort}/targets`);
              const data = await raw.json() as any;
              if (data?.targets.length > 0) {
                const devToolsUrl = `http://localhost:${availablePort}/front_end/chii_app.html?ws=localhost:${availablePort}/client/${Math.random().toString(20).substring(2, 8)}?target=${data.targets[0].id}&rtc=false`;

                res.writeHead(302, { Location: devToolsUrl });
                res.end();
              }
            }
            catch (error) {
              debug(`${error}`);
              res.writeHead(502);
              res.end();
            }
          });
        }

        server.middlewares.use('/open-dingtalk', (req, res) => {
          debug(targetURL.toString());
          res.writeHead(302, {
            Location: `dingtalk://dingtalkclient/page/link?url=${encodeURIComponent(targetURL.toString())}`,
          });

          if (options?.vueDevtools?.enable && !resovedInfo.devtoolsInstance) {
            resovedInfo.devtoolsInstance = exec('npx vue-devtools');

            console.log(`  ${c.green('➜')}  vue-devtools is running. If the devtools has no data, please refresh the page in dingtalk.`);

            resovedInfo.devtoolsInstance.on('exit', () => {
              resovedInfo.devtoolsInstance = undefined;
            });

            process.on('exit', () => {
              if (resovedInfo.devtoolsInstance) {
                resovedInfo.devtoolsInstance.kill();
              }
            });
          }

          res.end();
        });
      },
    },
    webpack(compiler) {
      if (!options?.enable) {
        return;
      }

      const devServerOptions = {
        host: 'localhost',
        port: 8080,
        ...compiler.options.devServer,
        // @ts-expect-error vuecli
        ...(process.VUE_CLI_SERVICE?.projectOptions.devServer),
      };
      const source = `${devServerOptions.host === '0.0.0.0'
        ? '127.0.0.1'
        : devServerOptions.host}:${devServerOptions.port}`;
      const base = compiler.options.output.publicPath || '/';
      const _targetUrl = options?.targetUrl ?? `http://${source}${base}`;

      compiler.hooks.done.tap('unplugin-dingtalk', () => {
        console.log(`  ${c.green('➜')}  ${c.bold(
          `Open in dingtalk${
            options?.vueDevtools?.enable
              ? ' (with vue-devtools)'
              : ''
          }`,
        )}: ${colorUrl(`http://${source}${base}open-dingtalk`)}`);
        if (enableChii) {
          console.log(`  ${c.green('➜')}  ${c.bold(
            'Click to open chrome devtools',
          )}: ${colorUrl(`http://${source}${base}__chrome_devtools`)}`);
        }
      });

      resovedInfo.targetURL = new URL(_targetUrl);
      resovedInfo.targetURL.searchParams.append('ddtab', 'true');
      if (options?.corpId) {
        resovedInfo.targetURL.searchParams.append('corpId', options.corpId);
      }
    },
  };

  plugins.push(unpluginDing);

  return plugins;
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);
export default unplugin;
