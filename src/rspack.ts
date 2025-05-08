import { createRspackPlugin } from 'unplugin';
import cookie from 'cookie';
import c from 'picocolors';
import type { Options, RspackSetupMiddlewares } from './types';
import { getChromeDevtoolsHtml } from './__chrome_devtools';
import { resovedInfo, unpluginFactory } from '.';

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

  const injectSetupMiddlewares: RspackSetupMiddlewares = (middlewares, _devServer) => {
    if (options.debugCookies && options.debugCookies.length > 0) {
      middlewares.unshift((req, res, next) => {
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
      middlewares.unshift(async (req, res, next) => {
        if (req.url !== '/__chrome_devtools') {
          return next();
        }
        try {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.write(getChromeDevtoolsHtml(resovedInfo.availablePort!));
          res.end();
        }
        catch (error) {
          debug(`${error}`);
          res.writeHead(502);
          res.end();
        }
      });
    }

    middlewares.unshift((req, res, next) => {
      if (req.url !== '/open-dingtalk') {
        return next();
      }
      const targetURL = resovedInfo.targetURL!;
      debug(targetURL.toString());
      res.writeHead(302, {
        Location: `dingtalk://dingtalkclient/page/link?url=${encodeURIComponent(targetURL.toString())}`,
      });

      res.end();
    });

    return middlewares;
  };

  return [injectSetupMiddlewares, createRspackPlugin(unpluginFactory)(options)] as const;
};
