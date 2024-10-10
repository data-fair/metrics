import type { DaemonConfig } from '../config/type/index.js'
import { assertValid } from '../config/type/index.js'
import config from 'config'

// we reload the config instead of using the singleton from the config module for testing purposes
// @ts-ignore
const daemonConfig = process.env.NODE_ENV === 'test' ? config.util.loadFileConfigs(process.env.NODE_CONFIG_DIR, { skipConfigSources: true }) : config
assertValid(daemonConfig, { lang: 'en', name: 'config', internal: true })

config.util.makeImmutable(daemonConfig)

export default daemonConfig as DaemonConfig
