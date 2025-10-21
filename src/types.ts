import type { IncomingMessage, ServerResponse } from 'node:http';
import type { viteVConsoleOptions } from 'vite-plugin-vconsole';

export interface Options {
  enable?: boolean
  targetUrl?: string
  corpId?: string
  debug?: boolean
  /** only support vite */
  vconsole?: viteVConsoleOptions
  chii?: {
    /** default true */
    enable?: boolean
    /**
     * default false
     * @link [chii embedded](https://chii.liriliri.io/docs/#usage)
     */
    embedded?: boolean
  }
  debugCookies?: string[]
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
  },
  server: ServerAPIs,
) => void;
