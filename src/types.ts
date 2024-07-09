import type { IncomingMessage, ServerResponse } from 'node:http';
import type { viteVConsoleOptions } from 'vite-plugin-vconsole';

export interface Options {
  enable?: boolean
  targetUrl?: string
  /** 是否启动dns服务器 */
  dns?: {
    host: string
    ip: string
  }
  corpId?: string
  debug?: boolean
  /** only support vite */
  vconsole?: viteVConsoleOptions
  chii?: {
    /** default true */
    enable?: boolean
    /** default 127.0.0.1 */
    host: string
  }
  debugCookies?: string[]
  vueDevtools?: {
    enable?: boolean
    /** default 127.0.0.1 */
    host?: string
    /** default 8098 */
    port?: number
  }
}

export type SetupMiddlewares = (middlewares: import('webpack-dev-server').Middleware[], devServer: import('webpack-dev-server')) => import('webpack-dev-server').Middleware[];

type NextFunction = () => void;

type RequestHandler = (req: IncomingMessage, res: ServerResponse, next: NextFunction) => void;

interface ServerAPIs {
  sockWrite: (type: string, data?: string | boolean | Record<string, any>) => void
}

export type RspackSetupMiddlewares = (
  /** Order: `unshift` => internal middlewares => `push` */
  middlewares: {
    /** Use the `unshift` method if you want to run a middleware before all other middlewares */
    unshift: (...handlers: RequestHandler[]) => void
    /** Use the `push` method if you want to run a middleware after all other middlewares */
    push: (...handlers: RequestHandler[]) => void
  }, server: ServerAPIs) => void;
