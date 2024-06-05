import type { viteVConsoleOptions } from 'vite-plugin-vconsole';

export interface Options {
  enable?: boolean
  targetUrl?: string
  corpId?: string
  debug?: boolean
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
