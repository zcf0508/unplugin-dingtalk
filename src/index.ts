import process from 'node:process';
import type { Buffer } from 'node:buffer';
import type { IncomingMessage } from 'node:http';
import { ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import fetch from 'node-fetch';
import type { UnpluginFactory, UnpluginOptions } from 'unplugin';
import { createUnplugin } from 'unplugin';
import type { Connect, ResolvedConfig } from 'vite';
import c from 'picocolors';
import cookie from 'cookie';
// @ts-expect-error missing types
import { start } from 'z-chii';
import { getRandomPort } from 'get-port-please';
import httpProxy from 'http-proxy';
import type { Options } from './types';

const cwd = process.cwd();

let config: ResolvedConfig;

const colorUrl = (url: string) => c.green(url.replace(/:(\d+)\//, (_, port) => `:${c.bold(port)}/`));

export const resovedInfo = {
  availablePort: undefined as number | undefined,
  targetURL: undefined as undefined | URL,
};

export const unpluginFactory: UnpluginFactory<Options | undefined, boolean> = (options) => {
  const {
    chii,
  } = options || {};

  const enableChii = chii?.enable !== false;

  function debug(...args: Parameters<typeof console.log>) {
    if (options?.debug) {
      console.log(`  ${c.yellow('DEBUG')}  `, ...args);
    }
  }

  const unpluginDing: UnpluginOptions = {
    name: 'unplugin-dingtalk',
    enforce: 'pre',
    transformInclude(id) {
      return (id.endsWith('main.ts') || id.endsWith('main.js')) && !id.includes('node_modules');
    },
    async transform(_source) {
      if (options?.enable && enableChii && !resovedInfo.availablePort) {
        resovedInfo.availablePort = await getRandomPort();
        start({
          port: resovedInfo.availablePort,
        });
        debug(`chii server port: ${resovedInfo.availablePort}`);
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
      transformIndexHtml(html: string) {
        if (options?.enable && enableChii) {
          return html.replace(
            '</body>',
            `</body>
<script>
  (() => { 
    const script = document.createElement('script'); 
    script.src="/__chii_proxy/target.js"; 
    ${options?.chii?.embedded
    ? 'script.setAttribute("embedded", "true");'
    : ''
} 
    document.body.appendChild(script); 
  })()
</script>
`,
          );
        }
      },
      async configureServer(server) {
        if (!options?.enable) {
          return;
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
            'Open in dingtalk',
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
              if (
                value
                && options.debugCookies
                && options.debugCookies.length > 0
                && options.debugCookies.includes(name)
              ) {
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
              const raw = await fetch(`http://localhost:${resovedInfo.availablePort}/targets`);
              const data = await raw.json() as any;
              if (data?.targets.length > 0) {
                const devToolsUrl = `http://localhost:${resovedInfo.availablePort}/front_end/chii_app.html?ws=localhost:${resovedInfo.availablePort}/client/${Math.random().toString(20).substring(2, 8)}?target=${data.targets[0].id}&rtc=false`;

                res.writeHead(302, { Location: devToolsUrl });
                res.end();
              }
              else {
                res.writeHead(404);
                res.end();
              }
            }
            catch (error) {
              debug(`${error}`);
              res.writeHead(502);
              res.end();
            }
          });

          // Proxy for Chii
          function createProxyMiddleware() { // No longer takes resovedInfo as an argument
            let proxy: httpProxy | null = null; // Store the proxy instance

            const handleUpgrade = (req: IncomingMessage, socket: Socket, head: Buffer) => {
              if (proxy && req.url?.startsWith('/__chii_proxy')) {
                debug('WS upgrade:', req.url);
                req.url = req.url.replace('/__chii_proxy', '');
                proxy.ws(req, socket, head);
              }
            };

            return (resolvedInfo: { availablePort?: number }): Connect.NextHandleFunction => {
              return (req, res, next) => {
                if (!proxy && resolvedInfo.availablePort) { // Create the proxy ONLY when needed, and only once.
                  proxy = httpProxy.createProxyServer({
                    target: `http://localhost:${resolvedInfo.availablePort}`,
                    ws: true,
                    // changeOrigin: true, // Consider if you need this
                  });

                  proxy.on('error', (err, req, res) => {
                    console.error('Proxy error:', err);

                    if (res instanceof ServerResponse) {
                      if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                      }
                      res.end(`Proxy error: ${err.message}`);
                    }
                    else if (res instanceof Socket) {
                      res.destroy();
                    }
                  });

                  if ((req.socket as any).server) {
                    (req.socket as any).server.on('upgrade', handleUpgrade);
                  }
                }

                if (proxy && req.url?.startsWith('/__chii_proxy')) {
                  debug(req.url);
                  req.url = req.url.replace('/__chii_proxy', '');
                  proxy.web(req, res);
                }
                else {
                  next();
                }
              };
            };
          }

          const proxyMiddleware = createProxyMiddleware();
          server.middlewares.use(proxyMiddleware(resovedInfo));
        }

        server.middlewares.use('/open-dingtalk', (req, res) => {
          debug(targetURL.toString());
          res.writeHead(302, {
            Location: `dingtalk://dingtalkclient/page/link?url=${encodeURIComponent(targetURL.toString())}`,
          });

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
          'Open in dingtalk',
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
    async rspack(compiler) {
      if (!options?.enable) {
        return;
      }

      const devServerOptions = {
        host: 'localhost',
        port: 8080,
        ...compiler.options.devServer,
        ...(await (await import('@rsbuild/core'))?.loadConfig({
          cwd,
        }))?.content?.server,
      };

      const source = `${devServerOptions.host === '0.0.0.0'
        ? '127.0.0.1'
        : devServerOptions.host}:${devServerOptions.port}`;
      const base = compiler.options.output.publicPath || '/';
      const _targetUrl = options?.targetUrl ?? `http://${source}${base}`;

      resovedInfo.targetURL = new URL(_targetUrl);
      resovedInfo.targetURL.searchParams.append('ddtab', 'true');
      if (options?.corpId) {
        resovedInfo.targetURL.searchParams.append('corpId', options.corpId);
      }

      console.log(`  ${c.green('➜')}  ${c.bold(
        'Open in dingtalk',
      )}: ${colorUrl(`http://${source}${base}open-dingtalk`)}`);
      if (enableChii) {
        console.log(`  ${c.green('➜')}  ${c.bold(
          'Click to open chrome devtools',
        )}: ${colorUrl(`http://${source}${base}__chrome_devtools`)}`);
      }
    },
  };

  return unpluginDing;
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);
export default unplugin;
