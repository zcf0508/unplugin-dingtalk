// @ts-expect-error nuxt imports
import { defineNitroPlugin } from '#imports';

export default defineNitroPlugin((nitroApp: any) => {
  nitroApp.hooks.hook('render:html', (html: any) => {
    // console.log('html', html);
    html.bodyAppend.push('<script src="/__chii_proxy/target.js"></script>');
  });
});
