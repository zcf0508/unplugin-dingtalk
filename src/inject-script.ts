// @ts-expect-error nuxt imports
import { defineNitroPlugin, useRuntimeConfig } from '#imports';

export default defineNitroPlugin((nitroApp: any) => {
  nitroApp.hooks.hook('render:html', (html: any) => {
    const config = useRuntimeConfig();
    const embedded = config.unpluginDingtalk?.chiiEmbedded ?? false;

    const scriptTag = embedded
      ? '<script src="/__chii_proxy/target.js" embedded="true"></script>'
      : '<script src="/__chii_proxy/target.js"></script>';

    html.bodyAppend.push(scriptTag);
  });
});
