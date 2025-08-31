// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/image', '@nuxt/ui', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'EorzeaDates :: Online Dating Community',
      titleTemplate: '%s - EorzeaDates :: Online Dating Community',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'}
      ]
    }
  },
  runtimeConfig: {
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL
  }
})