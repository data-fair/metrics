const { axiosAuth } = require('@data-fair/lib/node/axios-auth')
const { DataFairWsClient } = require('@data-fair/lib/node/ws')

before('init axios and ws instances', async () => {
  const directoryUrl = 'http://127.0.0.1:6218/simple-directory'
  const baseOpts = {
    directoryUrl,
    axiosOpts: { baseURL: 'http://127.0.0.1:6218' }
  }
  globalThis.ax = {
    superadmin: await axiosAuth({ email: 'superadmin@test.com', password: 'superpasswd', adminMode: true, ...baseOpts })
  }
  globalThis.ws = {
    superadmin: new DataFairWsClient({ url: 'http://127.0.0.1:6218/data-fair', headers: { Cookie: globalThis.ax.superadmin.defaults.headers.Cookie } })
  }
})

after('close ws sockets', () => {
  globalThis.ws.superadmin.close()
})
