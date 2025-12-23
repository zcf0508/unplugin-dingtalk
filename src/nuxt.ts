import type { Buffer } from 'node:buffer';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type { Options } from './types';
import { addDevServerHandler, addServerPlugin, addVitePlugin, addWebpackPlugin, createResolver, defineNuxtModule } from '@nuxt/kit';
import httpProxy from 'http-proxy';
import c from 'picocolors';
import { CHII_DEVTOOLS_PATH, CHII_PROXY_PATH, getChiiClientModuleCode, resovedInfo, VIRTUAL_CHII_CLIENT } from '.';
import { colorUrl, interopDefault } from './utils';
import vite from './vite';
import webpack from './webpack';
import '@nuxt/schema';

export interface ModuleOptions extends Options {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-unplugin-dingtalk',
    configKey: 'unpluginDingtalk',
  },
  defaults: {
    // ...default options
  },
  async setup(options, _nuxt) {
    if (!_nuxt.options.dev) {
      return;
    }

    if (!options.enable) {
      return;
    }

    const { defineEventHandler, proxyRequest } = await interopDefault(await import('h3'));

    function debug(...args: Parameters<typeof console.log>) {
      if (options?.debug) {
        console.log(`  ${c.yellow('DEBUG')}  `, ...args);
      }
    }

    const { chii } = options || {};

    const enableChii = chii?.enable !== false;

    // 将配置传递给 Nitro runtime
    _nuxt.options.runtimeConfig.unpluginDingtalk = {
      chiiEmbedded: chii?.embedded ?? false,
      chiiProxyPath: CHII_PROXY_PATH,
      chiiClientPath: VIRTUAL_CHII_CLIENT,
    };

    if (enableChii) {
      const resolver = createResolver(import.meta.url);

      // 添加 module 自己的 server plugin
      addServerPlugin(resolver.resolve('./inject-script'));

      let proxy: httpProxy | null = null;

      // HTTP 代理处理（保持原样）
      addDevServerHandler({
        route: CHII_PROXY_PATH,
        handler: defineEventHandler(async (event) => {
          if (resovedInfo.availablePort) {
            return proxyRequest(event, `http://localhost:${resovedInfo.availablePort}${event.path.replace(CHII_PROXY_PATH, '')}`);
          }
        }),
      });

      // 处理 WebSocket 升级
      _nuxt.hook('listen', (server) => {
        // 保存原有的 upgrade 监听器
        const originalUpgradeListeners = server.listeners('upgrade').slice();

        // 移除所有现有的 upgrade 监听器
        server.removeAllListeners('upgrade');

        // 添加我们的 upgrade 处理器（优先级最高）
        server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
          if (req.url?.startsWith(CHII_PROXY_PATH)) {
            debug('WS upgrade:', req.url);

            // 延迟创建 proxy
            if (!proxy && resovedInfo.availablePort) {
              proxy = httpProxy.createProxyServer({
                target: `http://localhost:${resovedInfo.availablePort}`,
                ws: true,
              });

              // 错误处理
              proxy.on('error', (err) => {
                debug('Proxy error:', err.message);
              });
            }

            if (proxy) {
              // 修改 URL 去掉前缀
              req.url = req.url.replace(CHII_PROXY_PATH, '');

              // 添加错误处理，防止连接异常
              socket.on('error', (err) => {
                debug('Socket error:', err.message);
              });

              try {
                proxy.ws(req, socket, head);
              }
              catch (err: any) {
                debug('WS upgrade failed:', err.message);
                socket.destroy();
              }

              // 阻止事件继续传播
              return;
            }
          }

          // 对于非 __chii_proxy 的请求，调用原有的监听器
          for (const listener of originalUpgradeListeners) {
            listener.call(server, req, socket, head);
          }
        });
      });

      addDevServerHandler({
        route: VIRTUAL_CHII_CLIENT,
        handler: defineEventHandler(async () => {
          return getChiiClientModuleCode(!!options?.chii?.embedded);
        }),
      });

      addDevServerHandler({
        route: CHII_DEVTOOLS_PATH,
        handler: defineEventHandler(async (event) => {
          if (!resovedInfo.availablePort) {
            return 'Server not started';
          }
          const { getChromeDevtoolsHtml } = await import('./__chrome_devtools');
          return getChromeDevtoolsHtml(resovedInfo.availablePort, CHII_PROXY_PATH);
        }),
      });
    }

    const vitePlugins = await vite(options);
    addVitePlugin(vitePlugins);
    // addWebpackPlugin(() => webpack(options));

    // ...

    // https://github.com/nuxt/cli/issues/220#issuecomment-1735394141
    _nuxt.hook('listen', (_, listener) => {
      const url = listener.url;
      const source = new URL(url).host;

      if (enableChii) {
        console.log(
          `  ${c.green('➜')}  ${c.bold(
            'Click to open chrome devtools',
          )}: ${colorUrl(`http://${source.replace('0.0.0.0', 'localhost')}${CHII_DEVTOOLS_PATH}`)}`,
        );
      }
    });
  },
});
