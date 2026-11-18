import type { AxiosAuthOptions } from '@data-fair/lib-node/axios-auth.js'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { privateHttpAgent } from '@data-fair/lib-node/http-agents.js'
import { axiosAuth as _axiosAuth } from '@data-fair/lib-node/axios-auth.js'
import mongo from '@data-fair/lib-node/mongo.js'

if (!process.env.NGINX_PORT) throw new Error('missing NGINX_PORT env variable, run "npx --no df-dev setup" to create the .env file')

// the session cookies of simple-directory are set on DEV_HOST: every call goes through nginx on that host
export const publicUrl = `http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}`
export const directoryUrl = `${publicUrl}/simple-directory`

// the dev stack runs on localhost: the private agent, the default public one refuses loopback addresses (SSRF protection)
export const axiosOpts = { baseURL: publicUrl, httpAgent: privateHttpAgent }

export const axios = (opts = {}) => axiosBuilder({ ...axiosOpts, ...opts })

export type AxiosAuth = Awaited<ReturnType<typeof _axiosAuth>>

export const axiosAuth = (opts: string | Omit<AxiosAuthOptions, 'directoryUrl' | 'axiosOpts' | 'password'>) => {
  opts = typeof opts === 'string' ? { email: opts } : opts
  const password = opts.email === 'superadmin@test.com' ? 'superpasswd' : 'passwd'
  return _axiosAuth({ ...opts, password, axiosOpts, directoryUrl })
}

/**
 * The dev environment is the test environment: the tests call the api pane through nginx, the access logs reach the
 * daemon pane, and the fixtures are written in the database of the dev processes (metrics-development).
 * Connected once per worker, the client is closed when the worker exits.
 */
let connected: Promise<void> | undefined
export const connectDevDb = () => {
  connected = connected ?? mongo.connect(`mongodb://localhost:${process.env.MONGO_PORT}/metrics-development`).then(() => {})
  return connected
}

export const dailyApiMetrics = async () => {
  await connectDevDb()
  return mongo.db.collection('daily-api-metrics')
}

export const clean = async () => {
  await (await dailyApiMetrics()).deleteMany({})
}
