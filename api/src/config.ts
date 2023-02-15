import config from 'config'
import * as validate from '~/validate'

const typedConfig = validate.config(config)
config.util.makeImmutable(config)
export default typedConfig
