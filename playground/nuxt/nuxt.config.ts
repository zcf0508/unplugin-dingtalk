// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // ssr:false,
  modules:[
    ['~/../../../src/nuxt', {
      enable: true,
      targetUrl: 'http://localhost:3000',
      chii:{
        // embedded: true,
      },
      debug: true,
    }]
  ]
})
