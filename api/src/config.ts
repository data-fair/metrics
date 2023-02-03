import fs from 'fs'
import config from 'config'
import Ajv from 'ajv/dist/jtd'
import { type Config } from '../types' // this was generated using jtd-codegen from config/config.jtd.json

const validate = new Ajv().compile(JSON.parse(fs.readFileSync('config/config.jtd.json', 'utf8')))
if (!validate(config)) throw new Error('invalid config', { cause: validate.errors })

config.util.makeImmutable(config)
const typedConfig = config as unknown as Config

export default typedConfig
