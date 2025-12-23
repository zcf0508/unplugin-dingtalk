import type { Options, SetupMiddlewares } from './types';
import cookie from 'cookie';
import c from 'picocolors';
import { createWebpackPlugin } from 'unplugin';
import { CHII_DEVTOOLS_PATH, CHII_PROXY_PATH, createProxyMiddleware, resovedInfo, unpluginFactory } from '.';
import { getChromeDevtoolsHtml } from './__chrome_devtools';

export default (options: Options) => {
  function debug(...args: Parameters<typeof console.log>) {
    if (options?.debug) {
      console.log(`  ${c.yellow('DEBUG')}  `, ...args);
    }
  }

  const {
    chii,
  } = options || {};

  const enableChii = chii?.enable !== false;

  const injectSetupMiddlewares: SetupMiddlewares = (middlewares, devServer) => {
    if (!options?.enable) {
      return middlewares;
    }

    if (options.debugCookies && options.debugCookies.length > 0) {
      devServer.app!.use((req, res, next) => {
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
      devServer.app!.get(CHII_DEVTOOLS_PATH, async (_req, res) => {
        try {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.write(getChromeDevtoolsHtml(resovedInfo.availablePort!, CHII_PROXY_PATH));
          res.end();
        }
        catch (error) {
          debug(`${error}`);
          res.writeHead(502);
          res.end();
        }
      });

      const proxyMiddleware = createProxyMiddleware(debug, CHII_PROXY_PATH);
      devServer.app!.use(proxyMiddleware(resovedInfo));
    }

    devServer.app!.get('/open-dingtalk', (req, res) => {
      const targetURL = resovedInfo.targetURL!;
      debug(targetURL.toString());
      res.writeHead(302, {
        Location: `dingtalk://dingtalkclient/page/link?url=${encodeURIComponent(targetURL.toString())}`,
      });

      res.end();
    });

    return middlewares;
  };

  return [injectSetupMiddlewares, createWebpackPlugin(unpluginFactory)(options)] as const;
};
