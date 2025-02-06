import { createWebpackPlugin } from 'unplugin';
import cookie from 'cookie';
import c from 'picocolors';
import fetch from 'node-fetch';
import type { Options, SetupMiddlewares } from './types';
import { resovedInfo, startVueDevtools, unpluginFactory } from '.';

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
      devServer.app!.get('/__chrome_devtools', async (_req, res) => {
        const availablePort = resovedInfo.availablePort!;
        try {
          const raw = await fetch(`http://localhost:${availablePort}/targets`);
          const data = await raw.json() as any;
          if (data?.targets.length > 0) {
            const devToolsUrl = `http://localhost:${availablePort}/front_end/chii_app.html?ws=localhost:${availablePort}/client/${Math.random().toString(20).substring(2, 8)}?target=${data.targets[0].id}&rtc=false`;

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
    }

    devServer.app!.get('/open-dingtalk', (req, res) => {
      const targetURL = resovedInfo.targetURL!;
      debug(targetURL.toString());
      res.writeHead(302, {
        Location: `dingtalk://dingtalkclient/page/link?url=${encodeURIComponent(targetURL.toString())}`,
      });

      startVueDevtools(options?.vueDevtools?.enable);

      res.end();
    });

    return middlewares;
  };

  return [injectSetupMiddlewares, createWebpackPlugin(unpluginFactory)(options)] as const;
};
