import type { Buffer } from 'node:buffer';
import type { IncomingMessage } from 'node:http';
import type { UnpluginFactory, UnpluginOptions } from 'unplugin';
import type { Connect, ResolvedConfig } from 'vite';
import type { Options } from './types';
import { ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import process from 'node:process';
import cookie from 'cookie';
import { getRandomPort } from 'get-port-please';
import httpProxy from 'http-proxy';
import c from 'picocolors';
import { createUnplugin } from 'unplugin';
// @ts-expect-error missing types
import { start } from 'z-chii';
import { getChromeDevtoolsHtml } from './__chrome_devtools';
import { colorUrl, getProjectHash, isNuxtProject } from './utils';

const cwd = process.cwd();
const projectHash = getProjectHash();
export const CHII_PROXY_PATH = `/${projectHash}/__chii_proxy`;
export const CHII_DEVTOOLS_PATH = `/${projectHash}/__chrome_devtools`;
export const VIRTUAL_CHII_CLIENT = `/${projectHash}/__chii_client.js`;

let config: ResolvedConfig;

export const resovedInfo = {
  availablePort: undefined as number | undefined,
  targetURL: undefined as undefined | URL,
};

// Proxy for Chii
export function createProxyMiddleware(debug: typeof console.debug, proxyPath: string) {
  let proxy: httpProxy | null = null;

  const handleUpgrade = (req: IncomingMessage, socket: Socket, head: Buffer) => {
    if (proxy && req.url?.startsWith(proxyPath)) {
      debug('WS upgrade:', req.url);
      req.url = req.url.replace(proxyPath, '');
      proxy.ws(req, socket, head);
    }
  };

  return (resolvedInfo: { availablePort?: number }): Connect.NextHandleFunction => {
    return (req, res, next) => {
      // 在代理之前就设置标记
      if (req.url?.startsWith(proxyPath)) {
        // @ts-expect-error skip other transforms
        req._skip_transform = true;
      }

      if (!proxy && resolvedInfo.availablePort) {
        proxy = httpProxy.createProxyServer({
          target: `http://localhost:${resolvedInfo.availablePort}`,
          ws: true,
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

      if (proxy && req.url) {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname.startsWith(proxyPath)) {
          debug('Proxying request:', req.url);
          req.url = req.url.replace(proxyPath, '');
          proxy.web(req, res);
          return;
        }
      }
      next();
    };
  };
}

// 判断是否是 nuxt 环境
const isNuxt = isNuxtProject();

export function getChiiClientModuleCode(embedded: boolean) {
  return `
;(function(){
  if (document.getElementById('__chii_client')) return;
  const script = document.createElement('script');
  script.id = '__chii_client';
  script.src="${CHII_PROXY_PATH}/target.js";
  ${embedded
    ? 'script.setAttribute(\'embedded\',\'true\');'
    : ''}
  document.body.appendChild(script);
})();
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    const old = document.getElementById('__chii_client');
    if (old) old.remove();
    const script = document.createElement('script');
    script.id = '__chii_client';
    script.src="${CHII_PROXY_PATH}/target.js";
    ${embedded
      ? 'script.setAttribute(\'embedded\',\'true\');'
      : ''}
    document.body.appendChild(script);
  });
}
  `;
}

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
    resolveId(source) {
      if (source === 'chii-client' || source === VIRTUAL_CHII_CLIENT) {
        return VIRTUAL_CHII_CLIENT;
      }
    },
    loadInclude(id) {
      return id === VIRTUAL_CHII_CLIENT;
    },
    load(id) {
      if (id === VIRTUAL_CHII_CLIENT || id.endsWith(VIRTUAL_CHII_CLIENT)) {
        return getChiiClientModuleCode(!!options?.chii?.embedded);
      }
    },
    transformInclude(id) {
      return !!id.split('?')[0].match(/\.[t|j]s$/);
    },
    async transform(source: string, id: string) {
      // initialize server once
      if (options?.enable && enableChii && !resovedInfo.availablePort) {
        resovedInfo.availablePort = await getRandomPort();
        start({ port: resovedInfo.availablePort });
        debug(`chii server port: ${resovedInfo.availablePort}`);
      }
      // inject client script at first user code module
      if (options?.enable && enableChii) {
        const file = id.split('?')[0];
        if (
          file.startsWith(config?.root || cwd)
          && !file.includes('node_modules')
          && file.match(/\.[t|j]s$/)
          && !isNuxt
        ) {
          return {
            code: `import '${VIRTUAL_CHII_CLIENT}';\n${source}`,
            map: null,
          };
        }
      }
      return { code: source, map: null };
    },
    vite: {
      configResolved(_config) {
        config = _config;
      },
      transformIndexHtml(html: string) {
        if (options?.enable && enableChii && !isNuxt) {
          const tag = `<script type="module">import '${VIRTUAL_CHII_CLIENT}';</script>`;
          if (!html.includes(tag)) {
            return html.replace(
              '</body>',
              `</body>${tag}\n`,
            );
          }
        }
        return html;
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
            )}: ${colorUrl(`http://${source}${base}${CHII_DEVTOOLS_PATH.replace(/^\//, '')}`)}`);
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
          server.middlewares.use(VIRTUAL_CHII_CLIENT, async (_req, res) => {
            const code = unpluginDing.load?.call(unpluginDing as any, VIRTUAL_CHII_CLIENT);
            debug('load virtual chii client:', VIRTUAL_CHII_CLIENT, !!code);
            if (code) {
              const content = typeof code === 'string'
                ? code
                : (code as any).code ?? getChiiClientModuleCode(!!options?.chii?.embedded);
              res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
              res.write(content || '');
              res.end();
              return;
            }
            res.writeHead(404);
            res.end();
          });

          server.middlewares.use(CHII_DEVTOOLS_PATH, async (_req, res) => {
            if (!resovedInfo.availablePort) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Server not started');
              return;
            }

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.write(getChromeDevtoolsHtml(resovedInfo.availablePort!, CHII_PROXY_PATH));
            res.end();
          });

          if (!isNuxt) {
            const proxyMiddleware = createProxyMiddleware(debug, CHII_PROXY_PATH);
            server.middlewares.use(proxyMiddleware(resovedInfo));
          }
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
          )}: ${colorUrl(`http://${source}${base}${CHII_DEVTOOLS_PATH.replace(/^\//, '')}`)}`);
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
        )}: ${colorUrl(`http://${source}${base}${CHII_DEVTOOLS_PATH.replace(/^\//, '')}`)}`);
      }
    },
  };

  return unpluginDing;
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);
export default unplugin;
