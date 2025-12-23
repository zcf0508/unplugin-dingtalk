import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import process from 'node:process';
import c from 'picocolors';

export type Awaitable<T> = T | Promise<T>;

export function getProjectHash() {
  return createHash('md5')
    .update(process.cwd())
    .digest('hex')
    .slice(0, 8);
}

export async function interopDefault<T>(m: Awaitable<T>): Promise<T extends { default: infer U } ? U : T> {
  const resolved = await m;
  return (resolved as any).default || resolved;
}

export const colorUrl = (url: string) => c.green(url.replace(/:(\d+)\//, (_, port) => `:${c.bold(port)}/`));

export function isNuxtProject() {
  const names = ['nuxt.config.ts', 'nuxt.config.js'];

  for (const name of names) {
    const path = `${process.cwd()}/${name}`;
    const result = existsSync(path);
    if (result) {
      return true;
    }
    else { continue; }
  }

  return false;
}
