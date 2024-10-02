import path from 'node:path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Vuetify from 'vite-plugin-vuetify'
import microTemplate from '@data-fair/lib/micro-template.js'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/metrics',
  optimizeDeps: { include: ['debug'] },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src/')
    },
  },
  plugins: [
    VueRouter({
      exclude: process.env.NODE_ENV === 'development' ? [] : ['src/pages/dev.vue']
    }),
    Vue(),
    VueI18nPlugin(),
    Vuetify(),
    AutoImport({
      imports: [
        'vue',
        'vue-i18n',
        {
          '@data-fair/lib/vue/session.js': ['useSession'],
          '@data-fair/lib/vue/reactive-search-params.js': ['useReactiveSearchParams'],
          ofetch: [['ofetch', '$fetch']],
          '~/context': [['uiConfig', '$uiConfig'], ['sitePath', '$sitePath'], ['apiPath', '$apiPath']]
        }
      ],
      dirs: [
        'src/composables',
        'src/components',
      ]
    }),
    {
      name: 'inject-site-context',
      async transformIndexHtml (html) {
        // in production this injection will be performed by an express middleware
        if (process.env.NODE_ENV !== 'development') return
        const { uiConfig } = await import('../api/src/config')
        return microTemplate(html, { SITE_PATH: '""', UI_CONFIG: JSON.stringify(uiConfig) })
      }
    }
  ],
})
