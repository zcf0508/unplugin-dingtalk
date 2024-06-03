import type { viteVConsoleOptions } from 'vite-plugin-vconsole';

export interface Options {
  enable?: boolean
  targetUrl?: string
  corpId?: string
  debug?: boolean
  vconsole?: viteVConsoleOptions
  debugCookies?: string[]
  vueDevtools?: {
    enable?: boolean
    host?: string
    port?: number
  }
}
