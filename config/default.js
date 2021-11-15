module.exports = {
  port: 8080,
  udpPort: 514,
  publicUrl: 'http://localhost:8080',
  mongoUrl: 'mongodb://localhost:27017/metrics-' + (process.env.NODE_ENV || 'development'),
  directoryUrl: 'http://localhost:8080',
  privateDirectoryUrl: '',
  httpLogs: {
    maxBulkSize: 500,
    maxBulkDelay: 60000
  },
  nuxtDev: false,
  proxyNuxt: false,
  i18n: {
    locales: 'fr,en',
    defaultLocale: 'fr'
  },
  brand: {
    logo: null,
    title: '@data-fair/metrics',
    description: '',
    url: null,
    embed: null
  },
  theme: {
    dark: false,
    colors: {
      primary: '#1E88E5', // blue.darken1
      secondary: '#42A5F5', // blue.lighten1,
      accent: '#FF9800', // orange.base
      error: 'FF5252', // red.accent2
      info: '#2196F3', // blue.base
      success: '#4CAF50', // green.base
      warning: '#E91E63', // pink.base
      admin: '#E53935' // red.darken1
    },
    darkColors: {
      primary: '#2196F3', // blue.base
      success: '#00E676' // green.accent3
    },
    cssUrl: null,
    cssText: ''
  },
  syslogSecret: ''
}
