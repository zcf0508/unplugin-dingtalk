import type { viteVConsoleOptions } from 'vite-plugin-vconsole';

export interface Options {
  enable?: boolean
  targetUrl?: string
  corpId?: string
  debug?: boolean
  vconsole?: viteVConsoleOptions
  vueDevtools?: {
    enable?: boolean
    host?: string
    port?: number
  }
}
