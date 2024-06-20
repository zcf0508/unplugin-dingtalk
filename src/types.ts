import type { viteVConsoleOptions } from 'vite-plugin-vconsole';

export interface Options {
  enable?: boolean
  targetUrl?: string
  corpId?: string
  debug?: boolean
  /** only support vite */
  vconsole?: viteVConsoleOptions
  /** default `true` */
  chii?: boolean
  debugCookies?: string[]
  vueDevtools?: {
    enable?: boolean
    host?: string
    port?: number
  }
}

export type SetupMiddlewares = (middlewares: import('webpack-dev-server').Middleware[], devServer: import('webpack-dev-server')) => import('webpack-dev-server').Middleware[];
