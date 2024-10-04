import childProcess from 'node:child_process'
import type { AxiosAuthOpts } from '@data-fair/lib/node/axios-auth.js'
import { axiosBuilder } from '@data-fair/lib/node/axios.js'
import { axiosAuth as _axiosAuth } from '@data-fair/lib/node/axios-auth.js'
import mongo from '@data-fair/lib/node/mongo.js'

const directoryUrl = 'http://localhost:6218/simple-directory'

const axiosOpts = { baseURL: 'http://localhost:6218' }

export const axios = (opts = {}) => axiosBuilder({ ...axiosOpts, ...opts })

export const axiosAuth = (opts: string | Omit<AxiosAuthOpts, 'directoryUrl' | 'axiosOpts' | 'password'>) => {
  opts = typeof opts === 'string' ? { email: opts } : opts
  const password = opts.email === 'superadmin@test.com' ? 'superpasswd' : 'passwd'
  return _axiosAuth({ ...opts, password, axiosOpts, directoryUrl })
}

export const clean = async () => {
  for (const name of ['daily-api-metrics']) {
    await mongo.db.collection(name).deleteMany({})
  }
}

process.env.SUPPRESS_NO_CONFIG_WARNING = '1'

export const startApiServer = async () => {
  process.env.NODE_CONFIG_DIR = 'api/config/'
  const apiServer = await import('../../api/src/server.ts')
  await apiServer.start()
}

export const stopApiServer = async () => {
  const apiServer = await import('../../api/src/server.ts')
  await apiServer.stop()
}

export const startDaemonServer = async () => {
  process.env.NODE_CONFIG_DIR = 'daemon/config/'
  const daemonServer = await import('../../daemon/src/server.ts')
  await daemonServer.start()
  // childProcess.execSync('chmod a+w ./dev/data/metrics.log.sock')
  childProcess.execSync('docker compose restart -t 0 nginx')
}

export const stopDaemonServer = async () => {
  const daemonServer = await import('../../daemon/src/server.ts')
  await daemonServer.stop()
}
