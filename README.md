# unplugin-dingtalk

[![NPM version](https://img.shields.io/npm/v/unplugin-dingtalk?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-dingtalk)

一键启动钉钉内调试。

## 功能
- [x] 在钉钉内打开调试链接
- [x] 可选注入 [vConsole](https://github.com/Tencent/vConsole) 用于调试 （仅支持 vite ）
- [x] 可选注入 [chii](https://github.com/liriliri/chii) 用于调试
- [x] 可选打开 [vue-devtools](https://github.com/vuejs/devtools) 用于调试
- [x] 支持调试 `HttpOnly` cookies

![images](https://github.com/zcf0508/unplugin-dingtalk/raw/main/images/Snipaste_2024-05-22_11-25-35.png)

## 安装

```bash
npm i unplugin-dingtalk --save-dev
```

```ts
interface Options {
  enable?: boolean
  targetUrl?: string
  corpId?: string
  debug?: boolean
  /**
   * only support vite
   *
   * @link https://github.com/vadxq/vite-plugin-vconsole#vitevconsole-options
   */
  vconsole?: viteVConsoleOptions
  /** 需要调试的 cookies， 避免无法调试 HttpOnly 的 cookie */
  debugCookies?: string[]
  /** 默认值 `true` */
  chii?: boolean
  vueDevtools?: {
    enable?: boolean
    host?: string
    port?: number
  }
}
```

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import UnpluginDingtalk from 'unplugin-dingtalk/vite';

export default defineConfig({
  plugins: [
    UnpluginDingtalk({
      enable: true,
    }),
  ],
});
```

<br></details>

<details>
<summary>Vue CLI 5</summary><br>

```js
// vue.config.js
const [setupMiddlewares, unpluginDingtalk] = require('unplugin-dingtalk/webpack').default({
  enable: true,
});

/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */
module.exports = {
  devServer: {
    setupMiddlewares,
  },
  configureWebpack: {
    plugins: [
      unpluginDingtalk,
    ],
  },
};
```

<br></details>
