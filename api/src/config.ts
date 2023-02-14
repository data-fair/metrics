import fs from 'fs'
import config from 'config'
import Ajv from 'ajv/dist/jtd'
// this was generated using jtd-codegen from config/config.jtd.json
// dcr jtd jtd-codegen api/config/config.jtd.json --typescript-out api/types
import { type ApiConfig } from '../../contract/typescript/api-config'

const validate = new Ajv().compile(JSON.parse(fs.readFileSync('config/config.jtd.json', 'utf8')))
if (!validate(config)) throw new Error('invalid config', { cause: validate.errors })

config.util.makeImmutable(config)
const typedConfig = config as unknown as ApiConfig

export default typedConfig
