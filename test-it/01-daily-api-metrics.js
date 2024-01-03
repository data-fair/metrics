import { test } from 'node:test'
import childProcess from 'node:child_process'
import { strict as assert } from 'node:assert'
import { axiosAuth } from '@data-fair/lib/node/axios-auth.js'
import { DataFairWsClient } from '@data-fair/lib/node/ws.js'
import * as testSpies from '@data-fair/lib/node/test-spies.js'

testSpies.registerModuleHooks()

process.env.SUPPRESS_NO_CONFIG_WARNING = '1'

process.env.NODE_CONFIG_DIR = 'daemon/config/'
const daemonServer = await import('../daemon/src/server.js')
await daemonServer.start()
childProcess.execSync('chmod a+w ./dev/data/metrics.log.sock')
childProcess.execSync('docker compose restart -t 0 nginx')

process.env.NODE_CONFIG_DIR = 'api/config/'
const apiServer = await import('../api/src/server.js')
await apiServer.start()

const directoryUrl = 'http://localhost:6218/simple-directory'
const axiosOpts = { baseURL: 'http://localhost:6218' }
const adminAx = await axiosAuth({ email: 'superadmin@test.com', password: 'superpasswd', directoryUrl, adminMode: true, axiosOpts })
const adminWS = new DataFairWsClient({ url: 'http://127.0.0.1:6218/data-fair/', headers: { Cookie: /** @type {string} */(adminAx.defaults.headers.Cookie) } })

try {
  await test('daily metrics should be collected by daemon', async function () {
    const dataset = (await adminAx.post('http://localhost:6218/data-fair/api/v1/datasets', {
      isRest: true,
      title: 'd1',
      schema: [{ key: 'prop1', type: 'string' }]
    })).data
    await adminWS.waitForJournal(dataset.id, 'finalize-end')
    await adminAx.get(`/data-fair/api/v1/datasets/${dataset.id}/lines`)
    const [rawLine, parsedLine] = await Promise.all([testSpies.waitFor('parseLogLine'), await testSpies.waitFor('pushLogLine')])
    console.log('raw line', rawLine)
    console.log('parsed line', parsedLine)
    // TODO
    // const rawLine = JSON.parse((await daemon.waitFor('test/raw-line/*')).replace('test/raw-line/', ''))
    // assert.equal(rawLine.h, '127.0.0.1')
    // assert.deepEqual(JSON.parse(rawLine.o), { type: 'user', id: 'superadmin' })
    // await daemon.waitFor('test/bulk/1')
  })
} finally {
  adminWS.close()
  await apiServer.stop()
  await daemonServer.stop()
}
