import type { AxiosAuthOptions } from '@data-fair/lib-node/axios-auth.js'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { privateHttpAgent } from '@data-fair/lib-node/http-agents.js'
import { axiosAuth as _axiosAuth } from '@data-fair/lib-node/axios-auth.js'
import mongo from '@data-fair/lib-node/mongo.js'

if (!process.env.NGINX_PORT) throw new Error('missing NGINX_PORT env variable, run "npm run dev-deps" to create the .env file')

// the session cookies of simple-directory are set on DEV_HOST: every call goes through nginx on that host
export const publicUrl = `http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}`
export const directoryUrl = `${publicUrl}/simple-directory`

// the dev stack runs on localhost: the private agent, the default public one refuses loopback addresses (SSRF protection)
export const axiosOpts = { baseURL: publicUrl, httpAgent: privateHttpAgent }

export const axios = (opts = {}) => axiosBuilder({ ...axiosOpts, ...opts })

export type AxiosAuth = Awaited<ReturnType<typeof _axiosAuth>>

export const axiosAuth = (opts: string | Omit<AxiosAuthOptions, 'directoryUrl' | 'axiosOpts' | 'password'>) => {
  opts = typeof opts === 'string' ? { email: opts } : opts
  // every test account uses the same password
  return _axiosAuth({ ...opts, password: 'passwd', axiosOpts, directoryUrl })
}

/**
 * The dev environment is the test environment: the tests call the api through nginx, the access logs reach the
 * daemon, and the fixtures are written in the database of the dev processes (MONGO_URL when it is set, as for the
 * processes, else metrics-development). Connected once per worker, the client is closed when the worker exits.
 */
let connected: Promise<void> | undefined
export const devMongoUrl = () => process.env.MONGO_URL || `mongodb://localhost:${process.env.MONGO_PORT}/metrics-development`
export const connectDevDb = () => {
  connected = connected ?? mongo.connect(devMongoUrl()).then(() => {})
  return connected
}

export const dailyApiMetrics = async () => {
  await connectDevDb()
  return mongo.db.collection('daily-api-metrics')
}

export const clean = async () => {
  await (await dailyApiMetrics()).deleteMany({})
}
