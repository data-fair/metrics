import type { ApiConfig } from '../config/type/index.ts'
import { assertValid } from '../config/type/index.ts'
import config from 'config'

const apiConfig = config

// maintain compatibility
// @ts-ignore
if (process.env.DIRECTORY_URL) apiConfig.privateDirectoryUrl = process.env.DIRECTORY_URL
assertValid(apiConfig, { lang: 'en', name: 'config', internal: true })

export default apiConfig as ApiConfig

// the fields exposed to the browser, listed one by one (none yet)
export const uiConfig = {}
export type UiConfig = typeof uiConfig
