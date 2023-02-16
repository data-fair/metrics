import config from 'config'
import * as types from '~/types'

const typedConfig = types.config.validate(config)
config.util.makeImmutable(config)
export default typedConfig
