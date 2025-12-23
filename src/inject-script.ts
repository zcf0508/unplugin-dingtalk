// @ts-expect-error nuxt imports
import { defineNitroPlugin, useRuntimeConfig } from '#imports';

export default defineNitroPlugin((nitroApp: any) => {
  nitroApp.hooks.hook('render:html', (html: any) => {
    const config = useRuntimeConfig();
    const embedded = config.unpluginDingtalk?.chiiEmbedded ?? false;
    const proxyPath = config.unpluginDingtalk?.chiiProxyPath || '/__chii_proxy';
    const clientPath = config.unpluginDingtalk?.chiiClientPath;

    let scriptTag = '';
    if (clientPath) {
      scriptTag = `<script type="module">import '${clientPath}';</script>`;
    }
    else {
      scriptTag = embedded
        ? `<script src="${proxyPath}/target.js" embedded="true"></script>`
        : `<script src="${proxyPath}/target.js"></script>`;
    }

    html.bodyAppend.push(scriptTag);
  });
});
