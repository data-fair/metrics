import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const messagesDir = join(import.meta.dirname, 'messages')
const messages: Record<string, Record<string, any>> = {}
for (const file of readdirSync(messagesDir)) {
  if (file.endsWith('.json')) {
    const lang = file.slice(0, -5)
    messages[lang] = JSON.parse(readFileSync(join(messagesDir, file), 'utf8'))
  }
}

const defaultLang = 'fr'

const lookup = (lang: string, key: string): string | undefined => {
  let val: any = messages[lang]
  for (const part of key.split('.')) {
    val = val?.[part]
    if (val === undefined) return undefined
  }
  return typeof val === 'string' ? val : undefined
}

export const t = (lang: string | undefined, key: string, vars?: Record<string, string>): string => {
  const resolvedLang = lang && messages[lang] ? lang : defaultLang
  let value = lookup(resolvedLang, key)
  if (value === undefined && resolvedLang !== defaultLang) {
    value = lookup(defaultLang, key)
  }
  if (value === undefined) return key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replaceAll(`{{${k}}}`, v)
    }
  }
  return value
}
