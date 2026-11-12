import type { DaemonConfig } from '../config/type/index.js'
import { assertValid } from '../config/type/index.js'
import config from 'config'

const daemonConfig = config
assertValid(daemonConfig, { lang: 'en', name: 'config', internal: true })

export default daemonConfig as DaemonConfig
