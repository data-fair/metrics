import path from 'node:path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Vuetify from 'vite-plugin-vuetify'
import microTemplate from '@data-fair/lib-utils/micro-template.js'
import { autoImports, settingsPath } from '@data-fair/lib-vuetify/vite.js'

// the ports drawn in .env for this checkout (dev/dev.json "ports"), exported by `df-dev zellij`
const envPort = (name: string) => {
  const port = Number(process.env[name])
  if (!Number.isInteger(port) || port <= 0) throw new Error(`missing ${name} env variable, run "npx --no df-dev setup" to create the .env file`)
  return port
}

// https://vitejs.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  base: '/metrics',
  optimizeDeps: { include: ['debug'] },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src/')
    },
  },
  html: {
    cspNonce: '{CSP_NONCE}'
  },
  plugins: [
    VueRouter({
      dts: './dts/route-map.d.ts',
      exclude: process.env.NODE_ENV === 'development' ? [] : ['src/pages/dev.vue']
    }),
    Vue(),
    VueI18nPlugin(),
    Vuetify({ styles: { configFile: settingsPath } }),
    AutoImport({
      dts: './dts/auto-imports.d.ts',
      vueTemplate: true,
      imports: [
        VueRouterAutoImports,
        ...(autoImports as any),
        {
          '~/context': ['$uiConfig', '$sitePath', '$cspNonce', '$apiPath', '$fetch'],
          '@mdi/js': [
            'mdiCalendarRange',
            'mdiDatabase',
            'mdiImageSizeSelectSmall',
            'mdiTableArrowDown',
            'mdiTrendingDown',
            'mdiTrendingNeutral',
            'mdiTrendingUp'
          ]
        }
      ],
      dirs: [
        'src/utils'
      ]
    }),
    Components({ dts: './dts/components.d.ts' }),
    {
      name: 'inject-site-context',
      async transformIndexHtml (html) {
        // in production this injection will be performed by an express middleware
        if (process.env.NODE_ENV !== 'development') return html
        const { uiConfigPath } = (await import('@data-fair/lib-express')).prepareUiConfig((await import('../api/src/config.ts')).uiConfig)
        return microTemplate(html, { SITE_PATH: '', UI_CONFIG_PATH: uiConfigPath, THEME_CSS_HASH: '', PUBLIC_SITE_INFO_HASH: '' })
      }
    }
  ],
  experimental: {
    renderBuiltUrl (filename, { hostType }) {
      if (hostType === 'html') return '{SITE_PATH}/metrics/' + filename
      return { relative: true }
    }
  },
  // `vite build` and `vite preview` must not require the dev ports
  server: command === 'serve' && !isPreview
    ? { port: envPort('DEV_UI_PORT'), strictPort: true, hmr: { port: envPort('DEV_UI_HMR_PORT') } }
    : undefined
}))
